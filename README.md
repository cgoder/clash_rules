# Clash Rules 配置项目

> 基于 Clash Meta 的代理配置，针对不稳定代理环境优化

## 📁 项目结构

```
clash_rules/
├── clash.js                       # 主配置（JS 覆写，逻辑的事实来源）
├── clashmi.yml                    # 同一套逻辑的静态 YAML 版（由 clash.js 派生）
├── clashmi_lite.js                # 简版覆写脚本
├── clashmi_flclash.js             # FlClash/BettBox 覆写脚本
├── flclash.js                     # FlClash 覆写脚本（第三方脚本修订版，独立血统）
├── ss.conf                        # Shadowrocket 配置（由 flclash.js 移植）
├── mihomoScript_clashmi_fused.js  # 融合版覆写脚本
├── scripts/
│   ├── gen_clashmi.mjs            # 由 clash.js 生成 clashmi.yml
│   ├── check_config_sync.mjs      # 校验 clash.js / clashmi.yml 逻辑一致
│   ├── check_flclash.mjs          # flclash.js 专项校验
│   ├── check_ss_conf.mjs          # ss.conf 静态校验
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

> `flclash.js` 是另一条来源：一份第三方生成脚本的修订版，组名（如「节点选择」「AI专线」）
> 与规则自成一套，与 `clash.js` 无派生关系，也不受 `check_config_sync.mjs` 约束。
> 它自带 SideStore 续签所需的 `tun.loopback-address` 与显式认证域名规则，
> 由 `scripts/check_flclash.mjs` 单独校验。
>
> 它的 AI 专线是**两层复用**结构，不是每个需求各造一套组：
> `AI专线`（select）= `AI自动选择`（跨地区 url-test 池）+ 已有国家地区组
> （`台湾节点` / `新加坡节点` / `日本节点` / `韩国节点` / `美国节点`）。
> 地区组是**与用途无关的可复用分组**，同时被 `节点选择` / `研发加速` / `流媒体服务` 引用；
> 为 AI 再派生一套 `AI-美国` 之类的专用地区组属于重复，已明确不再采用。

> `ss.conf` 是 `flclash.js` 到 Shadowrocket `.conf` 格式的移植版，共享同一套
> 组名、规则顺序与 AI 专线成员结构，但受平台能力限制少了几项（无 loopback、
> 无进程规则、无「手动选择」组、无 `empty-fallback`）。差异清单写在文件头，
> 由 `scripts/check_ss_conf.mjs` 校验。

---

## 🚀 快速开始

### 1. 下载配置文件
```bash
git clone https://github.com/cgoder/clash_rules.git
cd clash_rules
```

### 2. 选择配置文件

按客户端能力三选一：

- **clash.js**（主）：推荐。以覆写脚本方式加载，自动完成节点归一化、过滤与策略组生成，
  内置开关可裁剪地区组与场景组。组名：`默认代理` / `AI` / `YouTube` / `美国-自动选择` 系。
- **clashmi.yml**：同一套逻辑的静态 YAML 版，适合不支持 JS 覆写的客户端直接导入。
  节点同样由客户端注入，文件内不含订阅链接。
- **flclash.js**（旁系）：另一条血统，组名与规则自成一套（`节点选择` / `AI专线` /
  `亚太智能优选`）。自带 SideStore 续签所需的 `tun.loopback-address`。
- **ss.conf**：`flclash.js` 的 Shadowrocket 版，仅用于 iOS Shadowrocket。
  不提供 loopback 反射，因此**无法做 SideStore 续签**。

> `clash.js` 与 `flclash.js` 是两套互不相干的配置，组名不同、AI 层设计不同，
> 不要混用策略名，也不要假设一个文件的修改适用于另一个。

### 3. 提供节点来源
仓库不保存订阅链接、token 或节点凭据。节点由客户端或订阅转换流程提供，
`clash.js` 从传入配置的 `proxies` 中读取并治理。

### 4. 导入配置
- **Clash Verge Rev**：导入配置文件（用 `clash.js` 或 `clashmi.yml`）
- **FlClash / BettBox**：以覆写脚本方式引用 `clash.js`，或用 `flclash.js`
- **Clash Meta**：使用配置文件路径
- **Shadowrocket（iOS）**：导入 `ss.conf`

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
- OpenAI / Claude / Gemini / Copilot / Cursor / Perplexity / Groq / Mistral /
  HuggingFace / Grok 等统一归入「AI」组
- AI 组用 **fallback** 而非 url-test：只在当前出口不可用时才切换，不追延迟最低。
  Gemini 的流式响应断连即整段失败，且对出口 IP 跳变敏感，故稳定优先
- 成员顺序即故障转移顺序：`美国-自动选择` → `美国` → `兜底自动选择`

#### `flclash.js` / `ss.conf` 的 AI 专线（与 `clash.js` 不同的一套）

这两份配置是另一条血统，AI 层用的是**「自动池 + 地区组复用」两层结构**：

```
AI专线 (select)
├─ AI自动选择   url-test  TW·SG·JP·KR·US 单池，跨区自动容错
├─ 台湾节点     url-test  复用已有地区组
├─ 新加坡节点   url-test  复用已有地区组
├─ 日本节点     url-test  复用已有地区组
├─ 韩国节点     url-test  复用已有地区组
└─ 美国节点     url-test  复用已有地区组
```

**成员只含分组，不含裸节点。** AI 候选池的入选条件就是「恰好命中一个地区标签」，
所以每个 AI 节点必然属于上述地区组之一（实测未被地区组覆盖的 AI 节点集合为空）。
早前版本会把 `aiMembers` 逐个追加为成员，导致同一节点在面板上出现两次，已移除；
需要直选任意节点用「手动选择」。

**地区组是复用的分组结构，不为 AI 派生副本。** 这些地区组同时被 `节点选择` /
`研发加速` / `流媒体服务` 引用。为 AI 单独建 `AI-美国` 这类专用组会把 6 个地区组
扩到 11 个，两份正则还会各自漂移，已明确不采用。

**口径差异（有意保留）：** 禁区排除（香港/港/澳门/俄/中国/大陆 + HK/MO/RU/CN）只写在
`AI自动选择` 里，地区组不携带。所以「香港中转 美国 01」会进 `美国节点` 但不进
`AI自动选择`。在 `AI专线` 里手动切到 `美国节点` 时，自动选到的也可能是这类中转节点，
真实出口不是美国。两类组回答的是不同问题：地区组回答「该国相关所有节点」，
AI 池回答「出口国可从名称判定的节点」。

两级手动控制：
1. **AI专线 内选地区组** → 锁地区，地区组内 url-test 自动挑该地区最快节点
2. **地区组内固定单节点** → 面板点图钉，属**软固定**：节点死亡时自动回落到同组存活节点，
   恢复后弹回固定节点

> ⚠️ **软固定会被组级测速清空。** mihomo 对非 Selector 组执行组级测速时走
> `ForceSet("")` 并清 cachefile（`hub/route/groups.go`），因此在 FlClash 里对该 url-test
> 组点一次「测速」就会解除你的固定。固定后请避免对该组测速。
>
> 这也意味着 `AI专线`（select）内固定节点的语义与地区组内固定不同：前者把流量钉死在
> 死节点上直至手动更换，后者会自动降级并在恢复后回弹。AI 长连接建议用后者。

### 📺 场景化服务分组
- **YouTube**：独立分组（默认走「默认代理」）——上游 `geosite/google` 分类 `include:youtube`，
  因此 `youtube_domain` 规则必须早于 `google_domain`，否则 YouTube 会被 Google 组接走
- **Google / OneDrive**：独立分组，默认走「默认代理」
- **GitHub**：独立分组（默认走代理，可单独指定出口；与 Microsoft 解耦，不再被其规则集截走）
- **Microsoft / Apple**：默认「国内直连」，国内段不过代理
- **Cloudflare**：`challenges.cloudflare.com`（Turnstile 验证）、`workers.dev`、
  `pages.dev`、`cdnjs` 等关键子域显式走代理。CF 的国内解析常落到不可达前缀，
  实测直连全部失败；规则位于 `cn_domain` 之前，避免被国内兜底截走

> 场景组按「默认是否直连」分两类，成员列表也不同：
> - **代理型**（AI / Google / YouTube / OneDrive / GitHub）：成员只有代理类出口，
>   **不含「国内直连」**。此前一律附带直连成员，等于给境外业务开了个一键裸连按钮，误选即撞墙。
> - **直连型**（Microsoft / Apple）：保留「国内直连」作为默认，同时给出代理回退。
- **Apple Push（APNs）**：推送域名显式归入「Apple」组，不再单列专线组（见下方说明）

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

### flclash.js / ss.conf 的入口

这套配置的组名不同，出口语义也不同（地区组同时充当业务组与 AI 的手动入口）：

| 场景 | 建议设置 | 说明 |
|---|---|---|
| 一般浏览 | 「节点选择」→「亚太智能优选」或「故障自动转移」 | 前者追延迟，后者按地区序降级 |
| AI 服务 | 「AI专线」→「AI自动选择」（默认） | 跨地区单池，US 全挂会自动落到其他地区 |
| AI 锁地区 | 「AI专线」→「美国节点」/「日本节点」等 | 锁死在该地区内，组内再自动挑最快 |
| AI 锁单节点 | 进入对应地区组 → 点节点图钉 | 软固定；⚠️ 避免对该组测速，会清空固定 |
| 研发 / 流媒体 | 「研发加速」/「流媒体服务」 | 两者都引用同一批地区组 |

> 在地区组内固定节点会同时影响所有引用方（`节点选择` / `研发加速` / `流媒体服务` /
> `AI专线`）。若只想为 AI 单独固定一个节点而不影响其他业务，当前结构做不到，
> 需要接受这种全局性，或不在地区组内固定。

---

## ⚙️ 配置说明

### 配置文件对比

| 配置文件 | 策略组 | 规则 | 特点 | 适用场景 |
|---|---|---|---|---|
| **clash.js** | 26 | 40 | JS 覆写，动态生成组与规则，逻辑的事实来源 | ✅ 生产环境推荐 |
| **clashmi.yml** | 34 | 40 | 同一套逻辑的静态 YAML，由 `scripts/gen_clashmi.mjs` 派生 | 不支持 JS 的客户端 |
| clashmi_lite.js | — | — | 简版覆写脚本 | 轻量场景 |
| clashmi_flclash.js | — | — | FlClash / BettBox 覆写脚本 | 对应客户端 |
| flclash.js | 14 | 42 | 基于第三方生成脚本修订的 FlClash 覆写 | 需要该套组名与规则时 |
| ss.conf | 13 | 37 | Shadowrocket `.conf`，由 `flclash.js` 移植 | iOS Shadowrocket |
| mihomoScript_clashmi_fused.js | — | — | 融合版覆写脚本 | 需要与第三方底座合并时 |

> 策略组数按完整节点集（6 地区）测得；节点少的场景会按需跳过空组，
> 例如 `flclash.js` 无节点时只剩 5 组。
>
> `clashmi.yml`（34）比 `clash.js` 运行时（26）多，是因为静态版预先写入了
> 所有地区组，而 JS 版会跳过没有节点的地区。两者的组名集合与顺序仍由
> `scripts/check_config_sync.mjs` 强制对齐。

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

以下各项在 `clashmi.yml`、`clashmi_lite.js`、`clashmi_flclash.js`、`mihomoScript_clashmi_fused.js`、
`flclash.js` 五份配置中必须同时存在，任何新生成器都不得省略：

| 项 | 值 | 作用 |
|---|---|---|
| `tun.loopback-address` | `10.7.0.1` | SideStore 连本机 10.7.0.1 时被 TUN 环回，minimuxer 才能取到 UDID |
| `tun.stack` | `gvisor` | 对齐上游可用配置（`flclash.js` 用 `mixed`，loopback 在各栈均有实现，见下） |
| `tun.strict-route` | `false` | 对齐上游；开启严格路由会强制劫持本地/内网流量，易导致自环失败 |
| `rules/my_proxy.list` | `gsa.apple.com`、`developerservices2.apple.com`、`gspe1-ssl.ls.apple.com` | Apple ID 认证/安装服务域名必须走代理（国内直连不通） |
| 规则优先级 | private → **my_proxy** → my_direct → 国内直连快路径（`apple_cn` 等）→ 业务组 | 若 `apple_cn` 先命中，续签域名会被判为国内直连而失败 |

`flclash.js` 没有 `my_proxy` 规则集，改为三条显式 `DOMAIN` 规则，排在 `private-ip` 之后、
其余所有分流规则之前（实测位置 10–12，`apple-cn` 在 36）。不写显式规则时这三个域名会经
`geolocation-not-cn` 间接命中代理，属于依赖远程规则集内容；一旦上游把它们归入 `apple-cn`，
就会变成国内直连并导致续签失败。

关于 `tun.stack`：`loopback-address` 只是声明地址，地址反射由 sing-tun 的各栈自行实现——
`system`（`stack_system.go:432`）、`mixed`（继承 `system` 的 `processIPv4TCP`）、
`gvisor`（`stack_gvisor_tcp.go:48`）、`mipstack`（`stack_mipstack.go:271`）均有判定分支，
所以 `flclash.js` 保持 `mixed` 不影响续签。取 `gvisor` 只是对齐上游配置，不是功能前提。

手机端配合项：SideStore → Settings → VPN Configuration → **Device IP 填 `10.7.0.1`**；
改完覆写配置后需**断开 VPN 再重连**。若报
`SideStore could not determine this device's UDID (#1006)`，先升级到 LiveContainer/SideStore
nightly（LiveContainer 3.8.0 + SideStore 0.6.4 存在 loopback 续签回归，见 LiveContainer issue #1478）。

✅ 已修复（2026-10）：`tun.route-exclude-cidr` 并非 mihomo 关键字，正确名为
`route-exclude-address`。mihomo 对未知键**静默忽略**——实测 1.19.29 中把非法 CIDR 写进
`route-exclude-cidr` 能正常加载，同样内容写进 `route-exclude-address` 才会报 `ParsePrefix`。
因此该配置曾长期"看起来排除了内网、实际从未生效"，`clash.js` 的 `buildTunConfig()` 现已改用
正确键名。

⚠️ 改对键名后必须同步调整排除范围：`loopback-address` 是 `10.7.0.1`，所以
**`10.0.0.0/8` 与 `10.7.0.0/24` 都不能放进排除列表**，否则续签会失效。
当前取值（`192.168/16`、`172.16/12`、`100.64/10`、`169.254/16`、`fc00::/7`、`fe80::/10`）
已避开该冲突，并由 `scripts/check_config_sync.mjs` 的 `tun-keys` 校验守护：
它同时检查键名合法性，以及 loopback 是否被排除网段覆盖。`flclash.js` 由
`scripts/check_flclash.mjs` 做同一组检查（另有认证域名与空组回退）。

> Android 上的 FlClash 不读 `loopback-address`：`core/tun/tun.go` 从 VPN 参数重建
> `LC.Tun` 时只填 `Enable`／`Stack`／`DNSHijack`／`Inet4Address`／`MTU` 等字段，
> `RouteAddress` 来自 App 的 `vpnRouteAddress`。因此本条对 SideStore 续签的作用
> 限于 iOS 侧客户端（如 ClashMi）直接消费脚本 tun 段的场景，
> Android 端需自行确认 VPN 路由设置。

---

## 🛠️ 工具脚本

### flclash.js 回归测试

```bash
node scripts/check_flclash.mjs
MIHOMO=1 node scripts/check_flclash.mjs   # 额外跑 mihomo -t
```

`flclash.js` 与 `clash.js` 血统不同、组名不同，不能套用 `check_config_sync.mjs`。
本脚本校验它自己的硬约束：

| 检查 | 内容 |
|---|---|
| `loopback` | `tun.loopback-address` 含 `10.7.0.1` |
| `loopback-exclude` | 该地址未被 `route-exclude-address` 覆盖 |
| `tun-keys` | tun 键名合法（内核会静默忽略未知键） |
| `apple-auth` | 三个续签域名有显式规则、不走 DIRECT，且在 `apple-cn` 之前 |
| `empty-fallback` | 动态成员的组必须 `empty-fallback: REJECT` |
| `no-compatible` | 组内不得出现 `COMPATIBLE` |
| `rule-target` | 规则引用的规则集与目标组均存在 |

### ss.conf（Shadowrocket）校验

```bash
node scripts/check_ss_conf.mjs            # 离线
node scripts/check_ss_conf.mjs --remote   # 额外抓取 12 个远程规则集验证内容
```

Shadowrocket 没有官方 `.conf` 语法规范，也没有 CLI 可以 `-t` 验证，所以本
脚本只能抓住两类在编译期就能确定的静默失败：

| 检查 | 内容 |
|---|---|
| `group-type` / `group-ref` | 策略组类型合法、组间引用存在 |
| `rule-type` / `rule-target` | 规则类型合法、策略目标存在（否则该条不生效） |
| `final` | 最后一条必须是 `FINAL` 或 `MATCH` |
| `ruleset-kind` | `RULE-SET` 未指向纯域名表 |
| `loopback` | `10.7.0.1` 未被精确排除 |
| `block-quic` | 取值在 `all-proxy` / `all` / `always-allow` 内 |
| `order` | Apple 认证、GitHub、YouTube 均排在正确的规则之前 |
| `remote` | （`--remote`）逐个抓取规则集，核对首行是否含规则类型 |
最容易错的是 `RULE-SET` 与 `DOMAIN-SET` 混用：blackmatrix7 同时提供
`Xxx.list`（含规则类型）与 `Xxx_Domain.list`（纯域名表），加载错不会报错，
只会静默丢弃整份规则集。

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
| `Apple Push` | `fallback` → `select` → **已删除** | fallback 版因 `DIRECT` 恒 alive 而等价于永久直连；改 select 后默认仍是 DIRECT，等于多了个隐藏状态却无实际保障。现由「Apple」组统一承担 |
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

### 架构合理性修订（对照 mihomo 官方文档 v1.19.32）

| 问题 | 影响 | 处理 |
|---|---|---|
| 境外场景组混入「国内直连」 | AI/Google/YouTube/OneDrive/GitHub 各有一个一键裸连出口，误选即直连撞墙 | 代理型与直连型场景组成员分离，境外组不再含直连出口 |
| Apple Push 专线组 | fallback 版等价于永久直连；改 select 后默认仍 DIRECT，保障是名义上的 | 整组删除，推送域名显式归入「Apple」组 |
| `手动选择` 缺兜底 | 只含地区组，地区组集体失效时无出口 | 补 `兜底自动选择`，与「默认代理」对齐 |
| `default-nameserver` 含 `system` | 官方文档要求「必须为 IP」，`system` 属未承诺的扩展行为 | 改为纯 IP（阿里 / 腾讯） |
| `cn_ip` 在 fake-ip 下近乎空转 | 规则带 `no-resolve`，面对 fake-ip 地址不匹配真实网段 | 由 `cn_domain` 承担国内判定；`cn_ip` 作为非 fake-ip 场景的补充 |

`my_proxy.list` / `my_direct.list` 为 `classical` 行为，**只有域名类规则会生效**，
IP 类规则会被静默忽略。回归测试已加入断言，防止后续误加 `IP-CIDR`。

### 节点来源更新
- 仓库不保存任何订阅链接或节点凭据
- 节点更新由客户端或订阅转换流程负责
- 更新后建议运行 `node scripts/test_clash_js.mjs` 检查分组匹配

---

## 📊 运行开销

只有 `url-test` 与 `fallback` 组会周期性测速，`select` 组不参与自动测速
（只保留供面板手动测速用的 `url`）。

### clash.js

以 16 个节点、10 个活跃地区为例，一轮探测约 29 次拨号，周期 300 秒；
地区组越少、节点越少，拨号量越低。`-自动选择` 组默认 `hidden`，
不影响面板观感。

### flclash.js

6 地区样本下，参与周期测速的有 9 个组、共 21 个成员探测/轮：

| 组 | 类型 | interval | tolerance | 说明 |
|---|---|---|---|---|
| AI自动选择 | url-test | 300 | 100 | 跨地区单池 |
| 亚太智能优选 | url-test | 300 | 30 | 亚太地区 |
| 故障自动转移 | fallback | 180 | — | 按序降级 |
| 香港/台湾/新加坡/日本/韩国节点 | url-test | 300 | 20 | 各地区组 |
| 美国节点 | url-test | 300 | 50 | 跨洋延迟抖动更大 |

`AI专线` / `节点选择` / `研发加速` / `流媒体服务` / `手动选择` 为 select 组，不测速。
与 `clash.js` 的做法一致：select 组带 `interval` 会让内核为它注册 HealthCheck，
每个成员被重复拨号。

> AI 的 5 个地区组本身就已在 `AI自动选择` 的成员集内，两组会各自对同一批节点
> 拨号（alive 状态在节点对象上共享，但探测请求不共享）。这是「可手动锁地区」
> 的必要代价；`lazy` 未开启时即使没选也会按 interval 跑。

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

### 2026-10（下半月）
- ✅ `flclash.js` / `ss.conf` 的 `AI专线` 改为两层复用结构：
  `AI自动选择`（跨地区单池）+ 已有国家地区组（台/新/日/韩/美）
- ✅ 修正 `AI专线` 成员重复：地区组已覆盖全部 AI 节点，移除逐个追加的裸节点
  （此前同一节点在面板上出现两次）
- ✅ 明确地区组为可复用的分组结构，不为单个业务派生 `AI-美国` 这类专用副本
- ✅ 补录 `flclash.js` / `ss.conf` 的两级手动控制与软固定语义、组级测速清空固定的陷阱
- ✅ 修正文档：`ss.conf` 远程规则集 12 个（原误写 14），补齐各配置的策略组/规则计数

### 2026-10
- ✅ 修复节点治理的 5 处缺陷（场景组默认出口、`dialer-proxy` 断链、
  地区节点误过滤、注入代理重名、地区识别缺口与跨区重复）
- ✅ 健康检查参数复核：`tolerance` 150、https 测速 URL、`empty-fallback: REJECT`
- ✅ `unified-delay` 补齐（https 测速握手不再计入延迟）
- ✅ 新增 `scripts/test_clash_js.mjs` 回归测试
- ✅ `AI` 组改 `fallback` 稳定优先，规则集换 `category-ai-chat-!cn` 官方聚合分类，
  补 Cloudflare 关键子域

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
