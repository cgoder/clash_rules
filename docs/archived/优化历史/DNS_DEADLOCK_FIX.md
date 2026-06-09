# DNS 循环依赖修复说明

修复版本：v2（基于保守优化版）
修复时间：2026-06-02
修复优先级：🚨 致命问题（紧急修复）

---

## 修复内容

### 唯一修改：proxy-server-nameserver

**原配置（会死锁）：**
```yaml
proxy-server-nameserver:
  - https://1.1.1.1/dns-query    # DoH
  - https://8.8.8.8/dns-query    # DoH
```

**新配置（已修复）：**
```yaml
proxy-server-nameserver:
  - 223.5.5.5        # 阿里云 DNS（明文 UDP）
  - 119.29.29.29     # 腾讯 DNS（明文 UDP）
```

---

## 问题回顾

### 为什么会死锁？

**死锁链：**
```
1. 访问 google.com
   ↓
2. 需要 DNS 解析 → 使用 nameserver（走代理）
   ↓
3. 代理需要连接 cloudsa-jp.outleft-hy.xyz:443
   ↓
4. 需要解析 cloudsa-jp.outleft-hy.xyz → 使用 proxy-server-nameserver
   ↓
5. proxy-server-nameserver = https://1.1.1.1/dns-query（DoH）
   ↓
6. DoH 需要先连接 1.1.1.1:443（HTTPS）
   ↓
7. 但 1.1.1.1:443 可能被封锁/污染 → 连接失败
   ↓
8. 代理节点域名无法解析 → 代理无法连接
   ↓
9. nameserver 无法走代理 → DNS 降级被取消
   ↓
10. 所有国外服务不可用 ❌
```

### 日志证据

**741 次 DNS 解析失败：**
```
dns resolve failed: all DNS requests failed
context deadline exceeded
```

**DIRECT DNS 降级被取消：**
```
[TCP] dial DIRECT mihomo --> 1.1.1.1:443 error: operation was canceled
```

**代理节点无法解析：**
```
cloudsa-jp.outleft-hy.xyz:443 connect error: dns resolve failed
```

---

## 修复原理

### 为什么改用明文 DNS？

**代理节点地址解析的特殊性：**
- 这是整个代理系统的"引导程序"
- 必须100%可靠，不能依赖复杂协议
- 明文 UDP DNS：
  - 无需 HTTPS 连接
  - 无循环依赖
  - 几乎不会被封锁（DNS 53 端口）

**类比：**
- 就像操作系统的引导程序（bootloader）
- 必须简单、可靠、不依赖其他服务

---

## 泄漏权衡

### 会泄漏什么？

**泄漏内容：** 代理节点的域名
- 例如：`cloudsa-jp.outleft-hy.xyz`
- 例如：`orbittwcn01.orbit5cloud.com`

**泄漏对象：** 本地 ISP（中国电信/联通/移动）

**泄漏方式：** 明文 UDP DNS 查询

### 不会泄漏什么？

**不泄漏：**
- ✅ 你访问的网站（google.com、chatgpt.com 等）
- ✅ 你的浏览历史
- ✅ 实际流量内容

**原因：**
- 网站 DNS 查询仍然走 `nameserver`（通过代理）
- 只有代理节点的域名走 `proxy-server-nameserver`

---

## 风险评估

### 泄漏风险等级

**低风险（可接受）：**

1. **ISP 能知道什么？**
   - 你在查询某些国外域名（代理节点域名）
   - 这些域名明显是代理服务器

2. **ISP 能做什么？**
   - 封锁这些代理节点的 IP
   - 但无法知道你通过代理访问了什么网站

3. **实际影响？**
   - 代理提供商通常有大量节点
   - 单个节点被封，切换到其他节点即可
   - 你的真实浏览历史仍然保密

### 对比原方案

**原方案（DoH）：**
- 防泄漏：10/10
- 可用性：0/10（完全死锁）

**修复方案（明文 DNS）：**
- 防泄漏：7/10（泄漏代理节点域名）
- 可用性：9/10（解决死锁）

**结论：** 可用性 > 极端防泄漏

---

## 配置逻辑总结

修复后的完整 DNS 解析流程：

### 1. 代理节点地址解析
```yaml
proxy-server-nameserver:
  - 223.5.5.5        # 明文 DNS
  - 119.29.29.29
```
- 用途：解析 `cloudsa-jp.outleft-hy.xyz` 等代理节点域名
- 路由：直连（不走代理）
- 泄漏：是（代理节点域名）

### 2. 国外网站 DNS 解析
```yaml
nameserver:
  - "https://1.1.1.1/dns-query#一键代理"  # 优先
  - "https://8.8.8.8/dns-query#一键代理"
  - "https://1.1.1.1/dns-query#DIRECT"    # 降级
  - "https://8.8.8.8/dns-query#DIRECT"
```
- 用途：解析 google.com、chatgpt.com 等
- 路由：优先走代理，代理挂时降级直连
- 泄漏：正常时不泄漏，代理挂时降级可能泄漏

### 3. 国内网站 DNS 解析
```yaml
nameserver-policy:
  "geosite:cn,private":
    - 'https://doh.pub/dns-query'
    - 'https://dns.alidns.com/dns-query'
```
- 用途：解析 baidu.com、taobao.com 等
- 路由：直连（不走代理）
- 泄漏：是（但这是国内网站，可接受）

---

## 测试建议

### 测试步骤

1. **重启 Clash**
   - 应该能正常启动（<5 秒）

2. **测试 Telegram**
   - 应该能正常连接

3. **测试 Google**
   - 应该能正常访问

4. **查看日志**
   - 不应再有 `operation was canceled`
   - 不应有大量 `dns resolve failed`

### 预期结果

**正常运行：**
```
[TCP] dial Google (match RuleSet/google_domain) --> www.google.com:443 success
[TCP] dial Telegram (match RuleSet/telegram_ip) --> 91.108.56.127:443 success
```

**不再出现：**
```
dns resolve failed: all DNS requests failed ❌
operation was canceled ❌
```

---

## 后续优化建议

### 如果仍有问题

1. **检查 1.1.1.1/8.8.8.8 是否可直连**
   ```bash
   ping 1.1.1.1
   curl -I https://1.1.1.1/dns-query
   ```

2. **如果被封锁，修改 default-nameserver**
   ```yaml
   default-nameserver:
     - 1.1.1.1
     - 223.5.5.5  # 添加备用
   ```

### 长期优化

1. **使用代理节点 IP 代替域名**
   - 如果订阅支持，使用 IP 可完全避免此问题
   - 但可能影响节点切换的灵活性

2. **监控代理节点域名泄漏**
   - 定期更换代理提供商
   - 或使用域名前置（domain fronting）

---

## 文件清单

- `clashmi_LB.yml`：已修复的配置文件
- `LOG_ANALYSIS_REPORT.md`：详细日志分析
- `DNS_DEADLOCK_FIX.md`：本文件（修复说明）
- `CONSERVATIVE_OPTIMIZATION.md`：保守优化版说明（已过时）
- `CONFIG_CRITICAL_REVIEW.md`：批判性评估报告

---

## 致歉

这是我在配置设计中的严重失误：

1. **过度关注防泄漏**
   - 把所有 DNS 都改成了 DoH
   - 忽略了循环依赖的风险

2. **低估了 proxy-server-nameserver 的重要性**
   - 这是整个系统的"引导程序"
   - 必须简单可靠，不能用复杂协议

3. **没有充分测试**
   - 应该先在虚拟机中测试冷启动
   - 而不是直接给你一个无法使用的配置

**教训：** 可用性 > 极端防泄漏。配置必须先能用，再谈优化。
