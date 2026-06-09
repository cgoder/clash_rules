# DNS 防泄漏配置修改说明（方案3）

## 修改策略概述

**核心思想：** 分层 DNS 解析 + 流量路由控制，防止 DNS 查询泄漏真实位置，同时保留国内服务直连性能。

---

## 具体修改项及逻辑

### 1. `default-nameserver`（冷启动 DNS）

**原配置：**
```yaml
default-nameserver:
  - 223.5.5.5        # 阿里云 DNS
  - 119.29.29.29     # DNSPod
```

**修改为：**
```yaml
default-nameserver:
  - 1.1.1.1          # Cloudflare
  - 8.8.8.8          # Google
```

**修改逻辑：**
- 这是 Clash 启动时最先使用的 DNS，用于解析后续 DoH 服务器的域名（如 `doh.pub`）
- 原配置使用国内 DNS，会在检测工具中显示中国电信/阿里云的 IP
- 改用国际公共 DNS 后，初始查询不会暴露国内 ISP

**可能问题：**
- **冷启动慢 0.5-2 秒**：如果你的网络环境对 1.1.1.1/8.8.8.8 访问不佳（如部分地区 DNS 污染），首次解析 DoH 域名会变慢
- **DNS 污染风险**：少数地区可能污染 1.1.1.1 的响应，导致无法正确解析 DoH 服务器地址

---

### 2. `proxy-server-nameserver`（代理节点地址解析）

**原配置：**
```yaml
proxy-server-nameserver:
  - 223.5.5.5
  - 119.29.29.29
```

**修改为：**
```yaml
proxy-server-nameserver:
  - https://1.1.1.1/dns-query
  - https://8.8.8.8/dns-query
```

**修改逻辑：**
- 这个 DNS 专门用于解析代理服务器的域名（如 `hk.example.com`）
- 原配置用明文 UDP DNS 查询国内服务器，会被检测工具捕获
- 改用 DoH（DNS over HTTPS）后，查询内容被加密，且不经过本地 ISP

**可能问题：**
- **代理服务器连接失败**：如果 DoH 请求本身需要代理但陷入循环依赖，会导致无法连接
- **冷启动死锁**：Clash 刚启动时，如果 DoH 服务器 `1.1.1.1` 本身无法直连，会卡在解析代理节点地址的阶段
  - **缓解方案**：Clash 会回退到 `default-nameserver`，但可能延迟 5-10 秒

---

### 3. `nameserver`（主 DNS 解析器）

**原配置：**
```yaml
nameserver:
  - "https://1.1.1.1/dns-query#RULES"
  - "https://8.8.8.8/dns-query#RULES"
```

**修改为：**
```yaml
nameserver:
  - "https://1.1.1.1/dns-query#一键代理"
  - "https://8.8.8.8/dns-query#一键代理"
```

**修改逻辑：**
- `#RULES` 表示根据规则决定 DoH 请求是否走代理（可能直连）
- `#一键代理` 强制所有 DoH 查询都走代理，防止本地 ISP 看到查询内容
- 这是最关键的改动，确保所有非中国域名的 DNS 查询都通过代理服务器

**可能问题：**
- **代理断开后 DNS 失效**：如果代理节点全部故障，所有国外域名都无法解析
  - **影响范围**：只影响国外网站，国内网站通过 `nameserver-policy` 仍可解析
- **循环依赖风险**：如果代理节点本身的域名需要通过这个 DNS 解析，会死锁
  - **Clash 保护机制**：`proxy-server-nameserver` 会避免这个问题

---

### 4. `nameserver-policy`（分流策略）

**原配置：**
```yaml
nameserver-policy:
  "geosite:cn,private":
    - 'https://doh.pub/dns-query'
    - 'https://dns.alidns.com/dns-query'
```

**保持不变（无需修改）**

**逻辑说明：**
- 中国大陆域名（`geosite:cn`）和私有域名（`geosite:private`）使用国内 DoH
- 这些查询**不走代理**（通过 `direct-nameserver-follow-policy: true` 控制）
- 保证国内网站访问速度，同时这些查询被检测工具捕获是**可接受的**

**可能问题：**
- **国内 DoH 被劫持**：少数运营商可能干扰 `doh.pub` 的 HTTPS 连接
  - **概率极低**：DoH 使用 HTTPS 加密，劫持难度高
- **误判国内域名**：如果 `geosite:cn` 规则不完善，部分国内域名可能走国外 DNS（变慢）

---

### 5. `direct-nameserver`（直连域名专用）

**原配置：**
```yaml
direct-nameserver:
  - 'https://doh.pub/dns-query'
  - 'https://dns.alidns.com/dns-query'
```

**保持不变**

**逻辑说明：**
- 配合 `nameserver-policy` 使用，专门解析国内直连域名
- 这些 DoH 请求本身也是直连（不走代理）

---

### 6. WebRTC 配置（保持不变）

**现有配置：**
```yaml
sniffer:
  skip-domain:
    - "Mijia Cloud"
    - "dlg.io.mi.com"
    - "+.oray.com"
    - "+.sunlogin.net"
```

**保持逻辑：**
- 米家设备的 WebRTC 流量**直连**，允许泄漏本地 IP `58.213.115.242`
- 这是功能性必需，否则摄像头无法使用

---

## 边缘场景问题汇总

### 场景1：代理 App 刚启动

**问题链：**
1. Clash 启动 → 需要连接代理服务器
2. 代理服务器域名需要解析 → 使用 `proxy-server-nameserver`（DoH）
3. DoH 服务器 `1.1.1.1` 需要 IP → 使用 `default-nameserver`（1.1.1.1 直接查询）
4. 如果本地网络完全无法访问 1.1.1.1 → **卡住 5-10 秒后回退**

**缓解方案：**
- Clash 会缓存代理服务器的 IP（`store-fake-ip: true`）
- 非首次启动通常 <1 秒完成

---

### 场景2：所有代理节点故障

**问题：**
- `nameserver` 配置强制走代理（`#一键代理`）
- 如果代理全挂，国外域名 DNS 查询失败

**影响：**
- ✅ 国内网站正常（走 `nameserver-policy`）
- ❌ 国外网站无法访问（DNS 解析失败）

**用户表现：**
- 浏览器显示 "无法解析域名" 而不是 "连接超时"

---

### 场景3：DNS 污染严重地区

**问题：**
- `default-nameserver` 使用 1.1.1.1/8.8.8.8
- 如果本地 ISP 污染这两个 IP 的 UDP 53 端口响应

**影响：**
- 冷启动时无法解析 DoH 服务器地址（如 `doh.pub` → IP）
- 导致整个 DNS 系统无法初始化

**解决方案：**
- 可以在 `default-nameserver` 中混合使用国内 DNS：
  ```yaml
  default-nameserver:
    - 1.1.1.1
    - 223.5.5.5  # 备用
  ```
  这样首次查询可能泄漏，但保证可用性

---

### 场景4：代理服务器使用 IP 地址

**问题：**
- 如果订阅中的节点直接是 IP（如 `203.0.113.1:443`）
- `proxy-server-nameserver` 不会被使用（无需解析）

**影响：**
- ✅ 好处：避免了 `proxy-server-nameserver` 的潜在问题
- ⚠️ 坏处：无法通过域名更新服务器 IP

---

## 检测结果预期

### 修改后的泄漏检测结果

**WebRTC 测试：**
- 国内 STUN（小米/Bilibili）：仍然泄漏 `58.213.115.242`（✅ 预期内）
- 国外 STUN（Google/Cloudflare）：显示代理服务器 IP（✅ 修复）

**DNS 测试：**
- ❌ 不再出现中国电信/阿里云的解析 IP
- ✅ 所有 DNS 查询显示代理服务器所在地区的 IP

**VPN 溯源：**
- ❌ 不再显示 `{高雄 前镇区}`
- ✅ 显示代理服务器的城市

---

## 推荐监控方法

修改后建议定期检查：

1. **启动速度**：`clash.log` 中查看 DNS 初始化时间
2. **解析失败率**：`clash.log` 搜索 "dns resolve failed"
3. **泄漏检测**：使用 browserleaks.com 每月复查

---

## 回滚方案

如果遇到严重问题，恢复这两行即可：

```yaml
default-nameserver:
  - 223.5.5.5
  - 119.29.29.29

nameserver:
  - "https://1.1.1.1/dns-query#RULES"  # 改回 RULES
```

这样会恢复到原始配置（有泄漏但稳定）。
