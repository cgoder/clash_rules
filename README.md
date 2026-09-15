# Clash Rules 配置项目

> 基于 Clash Meta 的代理配置，针对不稳定代理环境优化

## 📁 项目结构

```
clash_rules/
├── clashmi.yml                  # 主配置文件（推荐使用）
├── clashmi_LB.yml              # 负载均衡专用配置
├── clashmi_optimized.yml       # 优化版配置
├── override.yml                # 简化主配置（无订阅链接）
├── docs/                       # 📚 文档目录
│   ├── README.md              # 文档导航
│   ├── guides/                # 使用指南
│   │   ├── 负载均衡配置指南.md
│   │   └── DNS配置说明.md
│   ├── analysis/              # 技术分析
│   │   └── 负载均衡vs故障转移对比.md
│   └── archived/              # 已归档文档
├── scripts/                    # 🛠️ 工具脚本
│   ├── README.md
│   └── validate_subscription.sh
├── rules/                      # 自定义规则
│   ├── my_direct.list
│   └── my_proxy.list
└── icons/                      # 策略组图标
```

---

## 🚀 快速开始

### 1. 下载配置文件
```bash
git clone https://github.com/cgoder/clash_rules.git
cd clash_rules
```

### 2. 选择配置文件
- **clashmi.yml**：当前完整主配置，保留更细的区域和场景分组。
- **override.yml**：`clashmi.yml` 的简化主配置版，不包含订阅链接或 `proxy-providers` 段。

### 3. 提供节点来源
仓库不保存订阅链接或订阅占位。使用 `override.yml` 时，需要由客户端或订阅转换流程先把节点合并进配置，策略组会通过 `include-all` 从已合并节点中筛选。

### 4. 导入配置
- **Clash Verge Rev**: 导入配置文件
- **FlClash**: 导入配置文件
- **Clash Meta**: 使用配置文件路径

### 5. 重启应用
重载配置，开始使用

---

## ✨ 核心特性

### 🎯 负载均衡策略
- **常用地区负载均衡**：HK/TW/SG/JP/US
- **速度优先策略**：自动选择最快节点
- **地理分组**：亚洲/欧洲/美洲/其他手动选择

### 🤖 AI 服务独立分组
- ChatGPT
- Claude
- Gemini

### 📺 场景化服务分组
- **流媒体**：YouTube/Netflix/Disney/Spotify/TikTok/AppleTV
- **通信**：Telegram/Twitter
- **云服务**：Google/Speedtest
- **GitHub**：独立分组（默认走代理，可单独指定出口；与 Microsoft 解耦，不再被其规则集截走）
- **金融**：PayPal

### 🌐 DNS 防污染/防泄漏
- 国内域名走国内 DNS（速度快）
- 国外域名走代理 DNS（防污染）
- 节点域名专用 DNS（避免循环依赖）

### 🔧 自动过滤无效节点
自动排除订阅中的信息行：
- 剩余流量
- 套餐到期
- 跳转域名等

---

## 📖 使用文档

### 核心指南
- [负载均衡配置指南](./docs/guides/负载均衡配置指南.md) - Load-Balance 策略详解
- [DNS配置说明](./docs/guides/DNS配置说明.md) - DNS 防污染和防泄漏方案

### 技术分析
- [负载均衡vs故障转移对比](./docs/analysis/负载均衡vs故障转移对比.md) - 选择合适的代理策略

### 工具脚本
- [脚本使用说明](./scripts/README.md) - 订阅验证等工具

---

## 🎮 策略选择建议

### 一般浏览/下载
```
一键代理 → 香港负载均衡
```
充分利用多节点，自动容错

### 游戏/视频会议
```
一键代理 → 香港速度优先
```
自动选择最快节点，延迟稳定

### AI 服务
```
ChatGPT → 美国负载均衡
Claude   → 美国负载均衡
Gemini   → 香港负载均衡 / 美国负载均衡
```

### 流媒体
```
流媒体 → 香港负载均衡 / 台湾负载均衡
```

---

## ⚙️ 配置说明

### 配置文件对比

| 配置文件 | 特点 | 适用场景 |
|---------|------|---------|
| **clashmi.yml** | 当前主配置 | ✅ 生产环境推荐 |
| clashmi_LB.yml | 负载均衡专用 | 节点非常不稳定时 |
| clashmi_optimized.yml | 优化版配置 | 替代方案 |
| override.yml | 简化主配置，无订阅链接，使用短英文策略组 | 需要客户端或订阅转换流程提供节点时 |

### 配置版本历史

| 版本 | 特点 | 状态 |
|------|------|------|
| v4 | 场景化分组，简化配置 | ✅ 当前生产版本 |
| v3 | 完整功能，移除冗余 DNS | ✅ 可用 |
| v2 | 修复 DNS 死锁问题 | ⚠️ 已被 v3 替代 |
| v1 | 初始防泄漏方案 | ❌ 存在 DNS 死锁 |

---

## 🔧 自定义规则

### 添加直连规则
编辑 `rules/my_direct.list`：
```
DOMAIN-SUFFIX,example.com
DOMAIN,specific.domain.com
IP-CIDR,192.168.1.0/24
```

### 添加代理规则
编辑 `rules/my_proxy.list`：
```
DOMAIN-SUFFIX,blocked-site.com
DOMAIN-KEYWORD,google
```

> 注意：该文件同时承载 SideStore/LiveContainer 续签所需的 Apple 认证域名，
> 详见[SideStore / LiveContainer 续签依赖](#-sidestore--livecontainer-续签依赖勿删项)。

---

## 📱 SideStore / LiveContainer 续签依赖（勿删项）

iPhone 上免电脑续签/安装（SideStore、LiveContainer、LiveContainer+SideStore 二合一）依赖 mihomo TUN
把 `10.7.0.1` 当回环地址，让 SideStore 的本地 lockdown 通道在设备内部自环，从而无需 LocalDevVPN。
上游参考实现：[tom-snow/Sidestore-ClashMi](https://github.com/tom-snow/Sidestore-ClashMi)（其
`profile_overwrite_min.yaml` 全文就三行：`tun.loopback-address: [10.7.0.1]`）。

以下各项在 `clashmi.yml`、`clashmi_lite.js`、`clashmi_flclash.js`、`mihomoScript_clashmi_fused.js`
四份配置中必须同时存在，任何新生成器都不得省略：

| 项 | 值 | 作用 |
|---|---|---|
| `tun.loopback-address` | `10.7.0.1` | SideStore 连本机 10.7.0.1 时被 TUN 环回，minimuxer 才能取到 UDID |
| `tun.stack` | `gvisor` | 对齐上游可用配置 |
| `tun.strict-route` | `false` | 对齐上游；开启严格路由会强制劫持本地/内网流量，易导致自环失败 |
| `rules/my_proxy.list` | `gsa.apple.com`、`developerservices2.apple.com`、`gspe1-ssl.ls.apple.com` | Apple ID 认证/安装服务域名必须走代理（国内直连不通） |
| 规则优先级 | private → **my_proxy** → my_direct → 国内直连快路径（`apple_cn` 等）→ 业务组 | 若 `apple_cn` 先命中，续签域名会被判为国内直连而失败 |

手机端配合项：SideStore → Settings → VPN Configuration → **Device IP 填 `10.7.0.1`**；
改完覆写配置后需**断开 VPN 再重连**。若报
`SideStore could not determine this device's UDID (#1006)`，先升级到 LiveContainer/SideStore
nightly（LiveContainer 3.8.0 + SideStore 0.6.4 存在 loopback 续签回归，见 LiveContainer issue #1478）。

⚠️ 已知遗留（未修，慎改）：`tun.route-exclude-cidr` 并非 mihomo 关键字（正确名为
`route-exclude-address`；已用 mihomo 1.19.29 实测：写错名的非法值会被静默忽略，正确名的非法值会报错）。
因此列表里的 `10.0.0.0/8` 实际从未生效——这也解释了为何 `loopback-address` 一直可用。
**若只把键名改对，`10.7.0.1` 会被排除出 TUN，续签会失效**；要真正排除内网，必须同时把
`10.7.0.0/24`（或 `10.7.0.1/32`）从排除段里挖出。

---

## 🛠️ 工具脚本

### 验证订阅节点分组
```bash
cd scripts
./validate_subscription.sh "<订阅文件或URL>"
```

**功能**：
- 检查所有节点是否正确分组
- 统计各地区节点数量
- 发现未匹配节点

详见 [scripts/README.md](./scripts/README.md)

---

## ⚠️ 注意事项

### DNS 配置
- ✅ 国外域名走代理 DNS（防污染）
- ✅ 节点域名走明文 DNS（避免死锁）
- ⚠️ 不要将 `proxy-server-nameserver` 改为 DoH

### 负载均衡使用
- ✅ 适合一般浏览、下载
- ✅ 不稳定节点自动容错
- ⚠️ 游戏/会议建议用"速度优先"

### 节点来源更新
- `override.yml` 不保存节点来源
- 节点更新由客户端或订阅转换流程负责
- 更新后建议运行验证脚本检查分组匹配

---

## 📊 性能提升

### vs Fallback 策略

| 指标 | 提升 |
|------|------|
| 单节点故障影响 | ↓ 92% |
| 带宽利用率 | ↑ 1300% |
| 容错速度 | ⚡ 即时 |
| 故障恢复 | ⚡ 自动 |

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request

### 贡献方向
- 优化配置参数
- 完善文档说明
- 添加实用脚本
- 分享使用经验

---

## 📝 更新日志

### v4 (2026-06-02)
- ✅ 场景化服务分组
- ✅ 简化配置结构
- ✅ 增强漏网之鱼功能

### v3 (2026-06-02)
- ✅ 移除冗余 DNS 配置
- ✅ 优化代理组结构

### v2 (2026-06-02)
- ✅ 修复 DNS 死锁问题
- ✅ 改用明文 proxy-server-nameserver

### v1 (2026-06-01)
- 🎉 初始版本发布

---

## 📞 支持

- 📖 查看 [文档](./docs/README.md)
- 🐛 提交 [Issue](https://github.com/cgoder/clash_rules/issues)
- 💬 讨论交流

---

## 📄 许可证

MIT License

---

## 🙏 致谢

感谢以下项目和资源：
- [Clash Meta](https://github.com/MetaCubeX/mihomo)
- [MetaCubeX Rules](https://github.com/MetaCubeX/meta-rules-dat)
- 其他规则集提供者

---

**⭐ 如果这个配置对你有帮助，请给项目加星支持！**
