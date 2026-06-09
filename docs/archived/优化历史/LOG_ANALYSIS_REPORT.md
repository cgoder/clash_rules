# 配置运行日志分析报告

运行时间：2026-06-02 18:14-18:15（约1分钟）
配置版本：保守优化版（DNS 降级 + 放宽健康检查）

---

## 🚨 严重问题：DNS 降级未生效

### 核心问题
**DNS 降级机制完全失效**，所有 DIRECT DNS 查询都被取消，没有成功解析任何域名。

### 证据

1. **DIRECT DNS 尝试次数：** 多次
   ```
   [TCP] dial DIRECT mihomo --> 1.1.1.1:443 error: operation was canceled
   [TCP] dial DIRECT mihomo --> 8.8.8.8:443 error: operation was canceled
   ```

2. **失败特征：** `operation was canceled`
   - 表示 DNS 查询还没开始就被取消
   - 不是 `timeout` 或 `connection refused`，而是主动取消

3. **代理 DNS 全部超时：** 741 次失败
   ```
   dns resolve failed: all DNS requests failed
   context deadline exceeded
   ```

### 根本原因分析

**循环依赖死锁：**

1. 访问 google.com → 需要 DNS 解析
2. DNS 配置要求先走代理（`#一键代理`）
3. 代理需要连接 `cloudsa-jp.outleft-hy.xyz:443`
4. 这个域名本身需要 DNS 解析
5. DNS 解析又需要通过代理 → **死锁**

**关键日志：**
```
[TCP] dial 一键代理 mihomo --> 1.1.1.1:443 error: 
  cloudsa-jp.outleft-hy.xyz:443 connect error: 
  dns resolve failed: requesting https://1.1.1.1:443/dns-query: 
  Get "https://1.1.1.1:443/dns-query?dns=AAABAAABAAAAAAAACmNsb3Vkc2EtanAKb3V0bGVmdC1oeQN4eXoAAAEAAQ": 
  context deadline exceeded
```

解析：
- Clash 试图通过代理连接 1.1.1.1 进行 DNS 查询
- 但代理节点 `cloudsa-jp.outleft-hy.xyz` 本身的域名无法解析
- 形成死锁

---

## 代理节点状态

### 使用的节点
- **日本节点：** `cloudsa-jp.outleft-hy.xyz:443`（大量使用）
- **台湾节点：** `orbittwcn01.orbit5cloud.com:721`（大量使用）

### 节点故障频率
- **日本负载均衡：** 频繁触发健康检查（每几秒一次）
- **台湾负载均衡：** 频繁触发健康检查（每几秒一次）

```
because 日本负载均衡 failed multiple times, activate health check
because 台湾负载均衡 failed multiple times, activate health check
```

### 节点故障原因
**不是节点本身故障，而是 DNS 解析失败导致**

所有连接错误都是：
```
connect error: dns resolve failed: context deadline exceeded
```

不是 `connection refused` 或 `timeout`，说明节点 IP 根本无法获取。

---

## DNS 解析流程分析

### 预期流程（保守优化版）
```
1. 尝试代理 DNS（1.1.1.1 via 一键代理）
2. 尝试代理 DNS（8.8.8.8 via 一键代理）
3. 降级：直连 DNS（1.1.1.1 DIRECT）← 这步被取消
4. 降级：直连 DNS（8.8.8.8 DIRECT）← 这步被取消
```

### 实际流程
```
1. 尝试代理 DNS → 超时（代理节点域名无法解析）
2. 尝试代理 DNS → 超时（同上）
3. 尝试直连 DNS → operation was canceled（被主动取消）
4. 尝试直连 DNS → operation was canceled（被主动取消）
```

### 为什么降级被取消？

**推测原因：**
- Clash 发现正在陷入循环依赖
- 主动取消了 DIRECT DNS 查询，避免死锁
- 或者：DIRECT DNS 查询还没轮到就因为整体超时被取消

---

## 根本问题：proxy-server-nameserver 的缺陷

### 配置回顾
```yaml
proxy-server-nameserver:
  - https://1.1.1.1/dns-query
  - https://8.8.8.8/dns-query
```

### 问题
**代理节点的域名解析使用 DoH，而 DoH 本身需要先建立 HTTPS 连接。**

**流程：**
1. Clash 需要解析 `cloudsa-jp.outleft-hy.xyz`
2. 使用 `proxy-server-nameserver`（DoH）
3. DoH 需要先连接 `1.1.1.1:443`
4. 但 `1.1.1.1` 是国外 IP，可能被封锁或污染
5. 连接 1.1.1.1 本身可能需要代理
6. 形成循环依赖

---

## 用户体验影响

### 实际表现
- **Telegram：** 完全无法连接
- **Google 服务：** 完全无法访问
- **所有国外服务：** DNS 解析失败
- **国内服务：** 未在日志中出现（可能正常）

### 时间线
```
18:14:31 - 18:15:16（45秒）
持续出现 DNS 解析失败
```

---

## 配置问题总结

### 问题1：DNS 降级策略设计缺陷

**原配置（保守优化版）：**
```yaml
nameserver:
  - "https://1.1.1.1/dns-query#一键代理"
  - "https://8.8.8.8/dns-query#一键代理"
  - "https://1.1.1.1/dns-query#DIRECT"  # 降级
  - "https://8.8.8.8/dns-query#DIRECT"  # 降级
```

**缺陷：**
- 前两个 DNS 走代理，依赖代理节点可连接
- 但代理节点域名的解析依赖 `proxy-server-nameserver`
- `proxy-server-nameserver` 使用 DoH，可能无法直连
- DIRECT 降级被 Clash 主动取消（循环依赖保护）

### 问题2：proxy-server-nameserver 使用 DoH

**原配置：**
```yaml
proxy-server-nameserver:
  - https://1.1.1.1/dns-query  # DoH
  - https://8.8.8.8/dns-query  # DoH
```

**缺陷：**
- DoH 需要先建立 HTTPS 连接
- 在某些网络环境下 1.1.1.1:443 无法直连（被封锁/污染）
- 导致代理节点域名无法解析
- 整个系统陷入死锁

---

## 与预期的差异

### 我们的预期
- 代理 DNS 超时后，自动降级到 DIRECT DNS
- DIRECT DNS 成功解析域名
- 服务恢复可用（虽然泄漏）

### 实际情况
- 代理 DNS 超时
- DIRECT DNS 被取消（`operation was canceled`）
- 所有服务不可用

### 差距原因
**我们低估了 `proxy-server-nameserver` 的影响：**
- 以为它只影响代理节点地址解析
- 没想到它使用 DoH 会导致循环依赖
- 没想到 Clash 会主动取消 DIRECT DNS 降级

---

## 建议修复方案

### 方案A：proxy-server-nameserver 改用明文 DNS（推荐）

```yaml
proxy-server-nameserver:
  - 223.5.5.5      # 阿里云 DNS（明文 UDP）
  - 119.29.29.29   # 腾讯 DNS（明文 UDP）
```

**理由：**
- 代理节点地址解析必须可靠
- 明文 DNS 无需 HTTPS 连接，不会循环依赖
- 这部分泄漏是可接受的（只泄漏代理节点域名，不泄漏访问的网站）

**权衡：**
- ⚠️ 泄漏代理节点域名（如 `cloudsa-jp.outleft-hy.xyz`）
- ✅ 解决循环依赖，保证系统可用

---

### 方案B：default-nameserver 混合使用国内 DNS

```yaml
default-nameserver:
  - 1.1.1.1
  - 223.5.5.5      # 添加国内 DNS 作为备用
```

**理由：**
- 如果 1.1.1.1 无法直连，回退到国内 DNS
- 至少保证 `proxy-server-nameserver` 的 DoH 服务器可以解析

**权衡：**
- ⚠️ 可能泄漏初始 DNS 查询
- ✅ 提高冷启动成功率

---

### 方案C：使用 fallback-filter（如果 Clash 支持）

```yaml
dns:
  fallback:
    - "https://1.1.1.1/dns-query#DIRECT"
  fallback-filter:
    geoip: true
    geoip-code: CN
```

**理由：**
- 主 DNS 走代理，fallback DNS 走直连
- 自动降级机制更可靠

**限制：**
- 需要确认 Clash Meta 是否支持此配置

---

## 优先级建议

### 立即修复（致命问题）
1. **修复 proxy-server-nameserver**（方案A）
   - 改用明文 DNS：223.5.5.5 和 119.29.29.29
   - 解决循环依赖死锁

### 短期优化
2. **混合 default-nameserver**（方案B）
   - 添加国内 DNS 备用
   - 提高冷启动成功率

### 长期验证
3. **测试 fallback-filter**（方案C）
   - 如果 Clash Meta 支持，使用更优雅的降级方案

---

## 总结

**当前配置的核心问题：**
- DNS 降级策略被循环依赖破坏
- `proxy-server-nameserver` 使用 DoH 导致冷启动失败
- 所有国外服务完全不可用

**不是节点不稳定，而是 DNS 配置导致节点无法连接。**

**必须立即修复 `proxy-server-nameserver`，否则配置完全不可用。**
