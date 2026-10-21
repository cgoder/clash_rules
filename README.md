# Clash Rules 配置项目

> 基于 Clash Meta 的代理配置，针对不稳定代理环境优化

## 📁 项目结构

```
clash_rules/
├── clash.js                       # 主配置（JS 覆写，逻辑的事实来源）
├── clashmi.yml                    # 同一套逻辑的静态 YAML 版（由 clash.js 派生）
├── clashmi_lite.js                # 简版覆写脚本
├── clashmi_flclash.js             # FlClash/BettBox 覆写脚本
├── mihomoScript_clashmi_fused.js  # 融合版覆写脚本
├── scripts/
│   ├── gen_clashmi.mjs            # 由 clash.js 生成 clashmi.yml
│   ├── check_config_sync.mjs      # 校验两份配置逻辑一致
│   └── test_clash_js.mjs          # clash.js 行为回归测试
├── rules/                         # 自定义规则
│   ├── my_direct.list
│   └── my_proxy.list
└── icons/                         # 策略组图标
```

> **`clash.js` 与 `clashmi.yml` 是同一套路由逻辑的两种形态**，面向不同客户端：
> 前者给支持 JS 覆写的客户端，后者给只能吃静态 YAML 的客户端。
> 两者的组名、规则顺序、规则集、健康检查参数必须一致，
> 由 `scripts/check_config_sync.mjs` 强制校验。修改任意一方后都要跑一次。

> 三份 `clashmi_*.js` / `mihomoScript_*.js` 脚本由 `clashmi.yml` 与第三方底座派生，
> 更新不如 `clash.js` 频繁，也不保证与它同步。改动前请先确认目标脚本的实际内容。

---

## 🚀 快速开始

### 1. 下载配置文件
```bash
git clone https://github.com/cgoder/clash_rules.git
cd clash_rules
```

### 2. 选择配置文件
两份配置**路由逻辑完全相同**，按客户端能力二选一：

- **clash.js**：推荐。以覆写脚本方式加载，自动完成节点归一化、过滤与策略组生成，
  内置开关可裁剪地区组与场景组。适用于支持 JS 覆写的客户端。
- **clashmi.yml**：同一套逻辑的静态 YAML 版，适合不支持 JS 覆写的客户端直接导入。
  节点同样由客户端注入，文件内不含订阅链接。

### 3. 提供节点来源
仓库不保存订阅链接、token 或节点凭据。节点由客户端或订阅转换流程提供，
`clash.js` 从传入配置的 `proxies` 中读取并治理。

### 4. 导入配置
- **Clash Verge Rev**：导入配置文件
- **FlClash / BettBox**：以覆写脚本方式引用 `clash.js`
- **Clash Meta**：使用配置文件路径

### 5. 重启应用
重载配置，开始使用

---

## ✨ 核心特性

### 🎯 动态地区组
- **按需建组**：自动识别港/日/台/新/美/韩/英/德/法/澳，没有节点的地区不生成空组
- **区内测速**：`XX-自动选择` 是纯本地区 `url-test`，只在该地区内挑最快，不跨区"叛逃"
- **单一归属**：同一节点只进一个地区组（国旗 > 无歧义国家码 > 定义顺序），
  避免一个节点同时挂在多个地区组里重复测速
- **其他节点组**：捕获 10 大地区之外的有效节点（土耳其、巴西等）

### 🤖 AI 服务独立分组
- ChatGPT / Claude / Gemini 合并为「AI」组，默认优先美国

### 📺 场景化服务分组
- **YouTube**：独立分组（默认走「默认代理」）——上游 `geosite/google` 分类 `include:youtube`，
  因此 `youtube_domain` 规则必须早于 `google_domain`，否则 YouTube 会被 Google 组接走
- **Google / OneDrive**：独立分组，默认走「默认代理」
- **GitHub**：独立分组（默认走代理，可单独指定出口；与 Microsoft 解耦，不再被其规则集截走）
- **Microsoft / Apple**：默认「国内直连」，国内段不过代理
- **Apple Push（APNs）**：独立 `select` 组，默认 `DIRECT`，可手动切到代理回退

> YouTube 与 GitHub 属于同一类陷阱：geosite 分类之间存在 `include` 包含关系
> （`google ⊃ youtube`、`microsoft ⊃ github`），规则顺序颠倒会让流量走错组。

### 🌐 DNS 防污染/防泄漏
- 默认完全尊重客户端的 DNS 设置（`OPTIONS.OVERRIDE_DNS = false`）
- 仅补齐 `dns.proxy-server-nameserver` 与 `default-nameserver`，解决「节点域名解析失败 → Dial 超时」
- 国内域名走国内 DNS、国外域名走代理 DNS 的完整方案见 `buildDnsAndHosts()`（需手动开启）

### 🔧 自动过滤无效节点
自动排除订阅中的信息行：
- 剩余流量 / 套餐到期 / 跳转域名等硬噪音
- 不含任何地区标识的营销节点（带国旗或地区名的节点一律保留）

---

## 📖 相关文档

- 本文件的[健康检查与超时判定](#健康检查与超时判定clashjs2026-10-修订)与
  [节点治理与配置自洽](#节点治理与配置自洽clashjs-p0-修复)记录了
  `clash.js` 各项参数与修复的实测依据。
- 面向 AI/自动化协作者的仓库约定见 [AGENT.MD](./AGENT.MD)。

---

## 🎮 策略选择建议

`clash.js` 生成的组都是 `select`（手动选择出口）或 `url-test`（组内自动选最快），
没有负载均衡组。常改的入口是「默认代理」和 7 大场景组：

| 场景 | 建议设置 | 说明 |
|---|---|---|
| 一般浏览、下载 | 「默认代理」→ 某个地区组，或直接选 `XX-自动选择` | 地区组内选 `-自动选择` 即可在该地区内自动容错 |
| 游戏、视频会议 | 地区组 → `XX-自动选择`；必要时把 `OPTIONS` 里 `UT_BASE.tolerance` 调小 | 自动选择会在本地区内挑延迟最低的节点 |
| AI 服务 | 「AI」→ 「美国」或「美国-自动选择」 | 默认已指向美国；地区内仍可再挑 |
| YouTube | 「YouTube」→「默认代理」 | 单独成组，避免被 `geosite/google`（含 `include:youtube`）接走 |
| 微软 / 苹果 | 「Microsoft」「Apple」默认「国内直连」 | 国内段直连更快；需要时再切到代理 |

地域入口优先级：`GLOBAL`（全局模式）→「默认代理」→ 地区组 → 具体节点。
`国内直连`、`兜底自动选择`、各 `-自动选择` 组默认隐藏，避免面板过载。

---

## ⚙️ 配置说明

### 配置文件对比

| 配置文件 | 特点 | 适用场景 |
|---------|------|---------|
| **clash.js** | JS 覆写，动态生成组与规则，逻辑的事实来源 | ✅ 生产环境推荐 |
| **clashmi.yml** | 同一套逻辑的静态 YAML，由 `scripts/gen_clashmi.mjs` 派生 | 不支持 JS 的客户端 |
| clashmi_lite.js | 简版覆写脚本 | 轻量场景 |
| clashmi_flclash.js | FlClash / BettBox 覆写脚本 | 对应客户端 |
| mihomoScript_clashmi_fused.js | 融合版覆写脚本 | 需要与第三方底座合并时 |

`clash.js` 的开关集中在文件顶部的 `OPTIONS` 与 `ruleOptionsEnable`：
前者控制是否接管 TUN / DNS / 规则等底层参数，后者对应客户端面板上可勾选的
地区组、场景组与过滤策略。

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

### clash.js 回归测试

```bash
node scripts/test_clash_js.mjs
```

覆盖节点治理与策略组生成的关键约束：场景组默认出口、改名后的
`dialer-proxy` 引用、地区节点过滤、注入代理重名、地区识别与单一归属。

加上 `MIHOMO=1` 还会用 mihomo 校验生成的配置：

```bash
MIHOMO=1 node scripts/test_clash_js.mjs
```

需要 PATH 中有 `mihomo`；未安装时该组用例会自动跳过。

### 两份配置的一致性校验

```bash
node scripts/check_config_sync.mjs
```

比对策略组名称与顺序、组类型、`default-selected`、健康检查参数、
规则顺序、规则集名称与 URL、注入代理、`unified-delay`，
并检查「YouTube 早于 Google」「GitHub 早于 Microsoft」等顺序陷阱。
任何一项漂移都会以非零退出码报出。

### 重新生成 clashmi.yml

`clashmi.yml` 的路由部分由 `clash.js` 的常量派生，不要手工改：

```bash
node scripts/gen_clashmi.mjs > clashmi.yml
```

---

## ⚠️ 注意事项

### DNS 配置
- ✅ 国外域名走代理 DNS（防污染）
- ✅ 节点域名必须有一条「可直连且能应答」的解析器（避免死锁）
- ✅ `clash.js` 新增 `OPTIONS.OVERRIDE_PROXY_DNS`（默认 `true`）：只补齐
  `dns.proxy-server-nameserver` 与 `dns.default-nameserver`，其余 DNS 仍完全尊重客户端。
  这是「大面积服务器超时」最常见的一条隐藏原因——节点域名解析失败会表现为 Dial 超时，
  与测速 URL 是否可达无关。
- ⚠️ 不要把 `proxy-server-nameserver` 配成「必须走代理才能解析」的地址（会形成解析死锁）；
  双 DoH + 明文 UDP + `system` 兜底是社区与内核维护者共识的稳妥组合

### 地区组与自动选择
- ✅ 地区组内选 `XX-自动选择`：在本地区内自动挑最快，节点抖动时自动容错
- ✅ 跨地区不自动切换：`-自动选择` 只含本地区节点，不会因延迟抖动"叛逃"到别的地区
- ⚠️ 需要单一稳定出口（网银、游戏长连接）时直接选具体节点，避免自动切换拆掉会话

### 健康检查与超时判定（clash.js，2026-10 修订）
以下参数均已用 mihomo 1.19.29 逐项实测确认，改动理由写进脚本头部注释：

| 项 | 修订 | 原因 |
|---|---|---|
| `url-test.tolerance` | `50` → `150` | 跨境延迟天然抖动 30~80ms，50ms 会让出口高频乒乓，每次切换拆掉 TCP/TLS 会话并让 IP 跳变 |
| 测速 URL | `http://` → `https://` | 明文 80 端口 204 易被透明缓存/DPI 干扰；`unified-delay` 二次请求失败时内核也会就 http 测速地址告警 |
| `empty-fallback` | `DIRECT` → `REJECT` | 境外组回退直连 = 流量裸奔撞 GFW（该字段仅在成员被过滤为空时生效） |
| select 组 | 去掉 `interval` | select 组带 interval 会让内核为它注册 HealthCheck，每个成员被重复拨号（实测 3 组 24 次/8s vs 6 次） |
| `Apple Push` | `fallback` → `select` + 默认 `DIRECT` | mihomo 的 fallback 永远返回首个 alive 成员，而 `DIRECT` 恒 alive，原 `["DIRECT","APNs-Fallback"]` 等价于永久直连 |
| `GLOBAL` | 加 `default-selected: 默认代理` | select 缺省取成员首个，原首位是 hidden 的「国内直连」，切全局模式会变成全局直连 |
| `unified-delay` | 客户端未声明时补 `true` | https 测速的 TLS 握手计入延迟（URLTest 的计时起点在 DialContext 之前），实测 2231ms → 308ms；unified-delay 用同连接第二条请求计时剥离握手，兼得 https 防劫持与 http 低开销 |

### 节点治理与配置自洽（clash.js P0 修复）

均附带可复现用例，见 `scripts/test_clash_js.mjs`（`MIHOMO=1` 时额外跑 `mihomo -t`）：

| 缺陷 | 现象 | 修复 |
|---|---|---|
| `分流组添加所有节点` 的默认出口失效 | 开启后场景组成员变成裸节点名，`default-selected`（组名）不在成员内，内核静默回落 `proxies[0]` —— Microsoft/Apple 从「国内直连」变成走首个境外节点 | 场景组始终保留组引用（`[...standardSvcList, ...allProxyNames]` 去重合并），并在生成前断言 `default-selected` 是真实成员 |
| 节点改名断掉 `dialer-proxy` | 节点与策略组撞名被改名后，引用它的中转节点让内核直接 `dialer-proxy [...] not found`，**整份配置加载失败** | 记录 `旧名→新名` 映射，定点迭代级联回写 `dialer-proxy`；仍悬空的引用删除并告警 |
| 内容过滤误杀地区节点 | 过滤条件用「是否属于 10 大地区」代替「是否带地区标识」，`🇹🇷 土耳其 官网`、`🇧🇷 巴西 优惠` 被当垃圾丢掉，**「其他节点」组永远建不出来** | 新增 `hasAnyRegionMarker()`：国旗 / 国家码 / 中文地名任一命中即视为有效地区节点 |
| 注入代理重名 | 订阅含 `DIRECT \| 仅IPv4` 时内核报 `duplicate name`，配置加载失败 | 注入名并入 `RESERVED_GROUP_NAMES`，订阅同名节点自动改名 |
| 地区识别缺口与误判 | `KR01`/`SIN`/`ICN`/`LAX`/`NRT` 认不出；`FRA`（法兰克福）被算成法国；`🇺🇸 香港 01` 同时进香港组和美国组，各自重复测速 | 国家码改为显式列举（`KR\|KOR`、`FR` 不含 `FRA`），补齐常见机场三字码；`classifyNode` 改为**单一归属**（国旗 > 无歧义国家码 > 定义顺序） |

### 节点来源更新
- 仓库不保存任何订阅链接或节点凭据
- 节点更新由客户端或订阅转换流程负责
- 更新后建议运行 `node scripts/test_clash_js.mjs` 检查分组匹配

---

## 📊 运行开销

`clash.js` 生成的组里只有 `url-test` 与 `fallback` 会周期性测速，
`select` 组不参与自动测速（只保留供面板手动测速用的 `url`）。

以 16 个节点、10 个活跃地区为例，一轮探测约 29 次拨号，周期 300 秒；
地区组越少、节点越少，拨号量越低。`-自动选择` 组默认 `hidden`，
不影响面板观感。

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

### 2026-10
- ✅ 修复节点治理的 5 处缺陷（场景组默认出口、`dialer-proxy` 断链、
  地区节点误过滤、注入代理重名、地区识别缺口与跨区重复）
- ✅ 健康检查参数复核：`tolerance` 150、https 测速 URL、`empty-fallback: REJECT`
- ✅ `unified-delay` 补齐（https 测速握手不再计入延迟）
- ✅ 新增 `scripts/test_clash_js.mjs` 回归测试

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
