# DNS 防泄漏配置修改总结

## 修改的配置项（共3处）

### 修改1：default-nameserver
```yaml
# 原配置（会泄漏）
default-nameserver:
  - 223.5.5.5        # 阿里云
  - 119.29.29.29     # 腾讯

# 新配置（防泄漏）
default-nameserver:
  - 1.1.1.1          # Cloudflare
  - 8.8.8.8          # Google
```

**作用：** Clash 冷启动时的初始 DNS，用于解析后续 DoH 服务器域名
**泄漏原因：** 使用国内 DNS 会在检测中显示中国电信/阿里云 IP
**修改效果：** 初始查询不再暴露国内 ISP

---

### 修改2：proxy-server-nameserver
```yaml
# 原配置（明文泄漏）
proxy-server-nameserver:
  - 223.5.5.5
  - 119.29.29.29

# 新配置（加密防泄漏）
proxy-server-nameserver:
  - https://1.1.1.1/dns-query
  - https://8.8.8.8/dns-query
```

**作用：** 解析代理服务器的域名地址
**泄漏原因：** 明文 UDP DNS 查询会被检测工具捕获
**修改效果：** 使用 DoH 加密查询，不经过本地 ISP

---

### 修改3：nameserver
```yaml
# 原配置（可能直连）
nameserver:
  - "https://1.1.1.1/dns-query#RULES"
  - "https://8.8.8.8/dns-query#RULES"

# 新配置（强制代理）
nameserver:
  - "https://1.1.1.1/dns-query#一键代理"
  - "https://8.8.8.8/dns-query#一键代理"
```

**作用：** 主 DNS 解析器（处理所有国外域名）
**泄漏原因：** `#RULES` 可能让部分 DoH 查询直连，暴露查询内容
**修改效果：** 强制所有 DoH 查询走代理，本地 ISP 无法看到查询内容

---

## 保持不变的配置

### nameserver-policy（分流策略）
```yaml
nameserver-policy:
  "geosite:cn,private":
    - 'https://doh.pub/dns-query'
    - 'https://dns.alidns.com/dns-query'
```
**说明：** 国内域名继续使用国内 DNS，保证访问速度

### WebRTC 配置
```yaml
sniffer:
  skip-domain:
    - "Mijia Cloud"
    - "dlg.io.mi.com"
```
**说明：** 米家设备允许直连，会泄漏本地 IP（功能需要）

---

## 边缘场景问题

### 问题1：冷启动变慢（0.5-2秒）
**原因：** 使用 1.1.1.1/8.8.8.8 解析 DoH 服务器地址
**触发条件：** 首次启动 + 本地网络访问国外 DNS 较慢
**缓解：** Clash 会缓存结果（`store-fake-ip: true`）

### 问题2：代理全挂后国外网站无法访问
**原因：** `nameserver` 强制走代理（`#一键代理`）
**表现：** 浏览器显示 "无法解析域名"
**影响范围：** 仅国外网站，国内网站正常

### 问题3：DNS 污染严重地区启动失败
**原因：** `default-nameserver` 的 1.1.1.1 被本地 ISP 污染
**解决方案：** 混合使用国内 DNS
```yaml
default-nameserver:
  - 1.1.1.1
  - 223.5.5.5  # 备用（可能泄漏但保证可用）
```

### 问题4：代理服务器连接延迟
**原因：** `proxy-server-nameserver` 使用 DoH 可能陷入循环依赖
**Clash保护：** 会回退到 `default-nameserver`，延迟5-10秒

---

## 预期检测结果

### WebRTC 测试
- 国内 STUN（小米/Bilibili）：✅ 泄漏 `58.213.115.242`（预期内）
- 国外 STUN（Google/Cloudflare）：✅ 显示代理 IP

### DNS 测试
- ❌ 不再出现中国电信/阿里云 IP
- ✅ 全部显示代理服务器所在地 IP

### VPN 溯源
- ❌ 不再显示 `{高雄 前镇区}`
- ✅ 显示代理服务器城市

---

## 使用建议

1. **首次使用**：重启 Clash，观察启动速度（正常 <3 秒）
2. **泄漏检测**：使用 browserleaks.com 验证修复效果
3. **日志监控**：查看 `clash.log` 搜索 "dns" 关键词
4. **问题回滚**：如遇严重问题，恢复原 `default-nameserver` 配置

---

## 技术原理

**DNS 查询流程（修改后）：**
1. 访问 `google.com` → Clash 判断需要代理
2. 查询 `google.com` 的 IP → 使用 `nameserver`（DoH via 代理）
3. DoH 请求发送到 `1.1.1.1` → 通过代理服务器
4. 本地 ISP 只看到加密的 HTTPS 流量，无法识别 DNS 查询

**国内网站直连流程：**
1. 访问 `baidu.com` → Clash 判断为国内域名
2. 查询 `baidu.com` 的 IP → 使用 `nameserver-policy`（DoH 直连）
3. DoH 请求发送到 `doh.pub` → 直接连接
4. 返回国内 CDN IP → 直连访问

**米家设备 WebRTC：**
1. 米家 APP 连接摄像头 → 触发 WebRTC STUN 请求
2. Clash 识别 `dlg.io.mi.com` → 跳过代理（`skip-domain`）
3. STUN 请求直连到小米服务器 → 获取本地 IP `58.213.115.242`
4. 允许这个泄漏，否则摄像头无法使用

---

## 文件清单

- `clashmi_LB.yml`：已修改的配置文件
- `DNS_LEAK_FIX_EXPLANATION.md`：完整技术文档
- `DNS_CHANGES_SUMMARY.md`：本文件（快速参考）
