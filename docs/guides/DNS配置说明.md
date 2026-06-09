# 🌐 DNS 配置说明

> DNS 防污染和防泄漏配置方案

## 📋 概述

本配置实现了分流 DNS 查询，确保：
- ✅ 国内域名走国内 DNS（速度快）
- ✅ 国外域名走代理 DNS（防污染）
- ✅ 代理节点域名专用 DNS（避免循环依赖）

---

## 🎯 DNS 解析流程

### 完整解析链路
```
用户请求域名
    ↓
① default-nameserver（解析 DoH 服务器域名）
    ↓
② nameserver-policy（国内域名策略）
    ↓
③ nameserver（国外域名 + #一键代理）
    ↓
④ proxy-server-nameserver（节点域名专用）
```

---

## ⚙️ 配置详解

### 1. default-nameserver（引导 DNS）
```yaml
default-nameserver:
  - 223.5.5.5      # 阿里 DNS
  - 119.29.29.29   # 腾讯 DNS
```

**用途**：解析 DoH 服务器域名（如 `doh.pub`、`dns.alidns.com`）  
**路由**：直连  
**特点**：明文 UDP，快速可靠

---

### 2. proxy-server-nameserver（节点 DNS）
```yaml
proxy-server-nameserver:
  - 223.5.5.5      # 阿里 DNS
  - 119.29.29.29   # 腾讯 DNS
```

**用途**：解析代理节点域名（如 `cloudsa-jp.outleft-hy.xyz`）  
**路由**：直连  
**重要性**：🚨 避免循环依赖，确保冷启动成功

#### ⚠️ 为什么必须用明文 DNS？

**错误配置（会死锁）：**
```yaml
proxy-server-nameserver:
  - https://1.1.1.1/dns-query    # DoH 需要先连接 HTTPS
```

**死锁链：**
```
访问 google.com 
→ 需要代理 
→ 解析代理节点域名 
→ 使用 DoH 
→ DoH 需要 HTTPS 连接 
→ 1.1.1.1 可能被封 
→ 代理无法启动 
→ 死锁 ❌
```

**正确配置（明文 DNS）：**
```yaml
proxy-server-nameserver:
  - 223.5.5.5      # 明文 UDP，无循环依赖
```

---

### 3. nameserver-policy（分流策略）
```yaml
nameserver-policy:
  "geosite:openai,anthropic,google-gemini,google,youtube,netflix,disney,spotify,telegram,twitter,tiktok,github,paypal": &proxy_dns
    - "https://1.1.1.1/dns-query#一键代理"
    - "https://8.8.8.8/dns-query#一键代理"
  "rule-set:my_proxy": *proxy_dns
  "rule-set:my_direct": *proxy_dns
```

**用途**：国外域名走代理 DNS  
**路由**：通过代理查询  
**效果**：防止 DNS 污染

---

### 4. nameserver（默认 DNS）
```yaml
nameserver:
  - 'https://doh.pub/dns-query'
  - 'https://dns.alidns.com/dns-query'
```

**用途**：国内域名和未匹配域名  
**路由**：直连  
**特点**：国内 DoH，速度快

---

## 🔒 防污染机制

### 什么是 DNS 污染？

**现象：**
```
查询 google.com → 返回虚假 IP（如 127.0.0.1）
```

**危害：**
- 无法访问国外网站
- 被重定向到错误页面

### 防污染方案

#### 方案1：国外域名走代理 DNS（当前方案）
```yaml
nameserver-policy:
  "geosite:google,youtube,...": 
    - "https://1.1.1.1/dns-query#一键代理"
```

**优点**：
- ✅ 彻底防污染
- ✅ 返回真实 IP

**缺点**：
- ⚠️ 依赖代理可用性

#### 方案2：DoH + 直连降级
```yaml
nameserver:
  - "https://1.1.1.1/dns-query#一键代理"  # 优先
  - "https://1.1.1.1/dns-query#DIRECT"    # 降级
```

**优点**：
- ✅ 代理挂时自动降级
- ✅ 可用性高

**缺点**：
- ⚠️ 降级时可能泄漏部分查询

---

## 🛡️ 防泄漏机制

### 什么是 DNS 泄漏？

**现象：**
```
使用代理访问国外网站
但 DNS 查询走本地 ISP
→ ISP 知道你在访问 google.com
```

### 防泄漏方案

#### 当前配置
```yaml
# 国外域名：走代理 DNS
nameserver-policy:
  "geosite:google,...": 
    - "https://1.1.1.1/dns-query#一键代理"

# 代理节点域名：走本地 DNS（必要泄漏）
proxy-server-nameserver:
  - 223.5.5.5
```

**泄漏评估：**
- ✅ 不泄漏：访问的网站（google.com、chatgpt.com）
- ⚠️ 泄漏：代理节点域名（cloudsa-jp.outleft-hy.xyz）

**风险评估：**
- 低风险（可接受）
- ISP 只知道你在使用代理，不知道访问内容
- 可用性 > 极端防泄漏

---

## 🔧 fake-ip 配置

### fake-ip 模式
```yaml
dns:
  enhanced-mode: fake-ip
  fake-ip-range: 198.18.0.1/16
```

**工作原理：**
```
应用查询 google.com 
→ 返回 fake-ip（198.18.0.1） 
→ 应用连接 198.18.0.1 
→ Clash 拦截，替换为真实 IP
```

**优点：**
- ✅ 加速 DNS 解析
- ✅ 避免 DNS 泄漏

### fake-ip-filter（排除列表）
```yaml
fake-ip-filter:
  - '*.lan'
  - '*.local'
  - 'localhost'
  - '+.ntp.org'
  - 'stun.*.*'
  - '+.xboxlive.com'
```

**用途**：这些域名必须返回真实 IP
- 局域网服务
- NTP 时间同步
- STUN 协议（WebRTC）
- 游戏服务

---

## ⚠️ 常见问题

### 问题1：冷启动失败

**症状**：
```
Clash 启动卡住，无法连接
日志：dns resolve failed
```

**原因**：
```yaml
# 错误配置
proxy-server-nameserver:
  - https://1.1.1.1/dns-query    # DoH 循环依赖
```

**解决**：
```yaml
# 正确配置
proxy-server-nameserver:
  - 223.5.5.5                    # 明文 DNS
```

---

### 问题2：国外网站打不开

**症状**：
```
google.com 返回 127.0.0.1 或超时
```

**原因**：DNS 污染

**解决**：
1. 检查 nameserver-policy 是否正确配置
2. 确认代理可用
3. 清除 DNS 缓存：
   ```bash
   # Windows
   ipconfig /flushdns
   
   # macOS
   sudo dscacheutil -flushcache
   ```

---

### 问题3：部分应用无法使用

**症状**：
```
银行 APP、游戏无法连接
```

**原因**：fake-ip 兼容性问题

**解决**：
```yaml
fake-ip-filter:
  - '+.your-bank.com'        # 添加到排除列表
  - '+.game-server.com'
```

---

## 📊 配置权衡

### 防污染 vs 可用性

| 方案 | 防污染 | 可用性 | 推荐 |
|------|--------|--------|------|
| 国外 DNS + 代理 | 10/10 | 8/10 | ✅ 推荐 |
| 国外 DNS + 直连降级 | 7/10 | 10/10 | ⚠️ 可用性优先 |
| 国内 DNS | 0/10 | 10/10 | ❌ 不推荐 |

### 防泄漏 vs 可用性

| 方案 | 防泄漏 | 可用性 | 推荐 |
|------|--------|--------|------|
| 所有 DNS 走代理 | 10/10 | 0/10 | ❌ 会死锁 |
| 国外 DNS 走代理 | 8/10 | 9/10 | ✅ 推荐 |
| 节点 DNS 明文 | 6/10 | 10/10 | ✅ 必要 |

---

## 🎯 最佳实践

### 1. 7x24 稳定运行
```yaml
# 国外域名：代理 DNS
nameserver-policy:
  "geosite:google,...": ["https://1.1.1.1/dns-query#一键代理"]

# 节点域名：明文 DNS（避免死锁）
proxy-server-nameserver: [223.5.5.5, 119.29.29.29]

# 国内域名：国内 DoH
nameserver: ['https://doh.pub/dns-query']
```

### 2. 极致防泄漏（牺牲可用性）
```yaml
# 所有国外查询走代理，但添加直连降级
nameserver:
  - "https://1.1.1.1/dns-query#一键代理"
  - "https://1.1.1.1/dns-query#DIRECT"    # 降级备用
```

### 3. 极致可用性（牺牲防泄漏）
```yaml
# 简化配置，只用国内 DNS
nameserver:
  - 'https://doh.pub/dns-query'
  - 'https://dns.alidns.com/dns-query'
```

---

## 📋 总结

### 当前配置特点
- ✅ 国外域名：走代理 DNS（防污染）
- ✅ 国内域名：走国内 DNS（速度快）
- ✅ 节点域名：明文 DNS（避免死锁）
- ✅ 平衡：防污染/防泄漏/可用性

### 推荐场景
1. **7x24 稳定运行** - 使用当前配置
2. **开发测试** - 使用直连降级方案
3. **极端隐私** - 考虑使用 VPN 而非单纯代理

### 不推荐
- ❌ proxy-server-nameserver 使用 DoH（会死锁）
- ❌ 所有 DNS 走国内（会被污染）
- ❌ 过度精简 fake-ip-filter（兼容性问题）
