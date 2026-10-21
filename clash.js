// 适配 BettBox 自定义配置参数
// ⚠️ 必须位于文件前 2000 字符内：BettBox 仅检查 head.substring(0,2000) 是否含
//    'Compatible_With_Bettbox'（lib/models/common.dart isCompatibleWithBettbox），
//    否则策略组面板不显示 ruleOptionsEnable 开关菜单
const Compatible_With_Bettbox = { ruleOptionsEnable: true };

// ============================================================
// 🚀 clash.js — 工业级 Mihomo/Clash 路由与策略预处理脚本
// 
// 核心哲学（结合 https://clash.md/zh/guide/config/best-practice）：
// 1. 明确平台管理边界：
//    - TUN 模式完全由客户端控制：避免在 iOS/macOS Network Extension 或非提权
//      桌面端写死 enable: true 导致平台冲突、权限弹窗或界面开关失效。
//    - DNS 完全由客户端控制：保留客户端 UI 界面自设的 DNS 解析器与 Fake-IP 模式，
//      不强行洗掉用户的本地网络设定。
// 2. 聚焦脚本最擅长的核心价值：
//    - 节点智能治理：自动归一化国旗 Emoji、重命名同名节点彻底杜绝 Loop 策略组自环死锁、
//      过滤剩余流量/到期等硬垃圾、保留有效地区营销节点。
//    - 动态地区感知按需建组：自适应识别 10 大地区（港/日/台/新/美/韩/英/德/法/澳），
//      无节点不残留空组；纯本地区 url-test 测速，防跨国“低延迟叛逃”。
//    - 7 大核心业务场景组：AI、Google、YouTube、OneDrive、GitHub、Microsoft、Apple。
//    - 严格规避上游规则包含陷阱：YouTube 必须在 Google 之前、GitHub 必须在 Microsoft 之前。
//    - 官方级 Apple Push（APNs）故障转移专线：直连优先 + APNs-Fallback，消息永不失联。
//    - clashmi 经典增强规则集：my_proxy（含 SideStore 续签保护）、my_direct 及大厂加速。
//    - 全链路国内加速：所有规则集（MRS）与图标统一通过 v4.gh-proxy.org 镜像加速。
//
// 2026-10 修订（全盘复核，逐项经 mihomo 1.19.29 实测确认）：
// 1. UT_BASE.tolerance 50 → 150：跨境延迟天然抖动 30~80ms，50ms 会让组内出口高频乒乓，
//    每次切换拆掉现有 TCP/TLS 会话并使出口 IP 跳变（触发风控、长连接断流）。
// 2. GROUP_BASE_OPTION.url http → https：明文 80 端口 204 易被透明缓存/DPI 干扰；
//    mihomo 在 unified-delay 二次请求失败时也会就 http 测速地址告警。
// 3. empty-fallback DIRECT → REJECT：境外场景组回退直连 = 流量裸奔撞 GFW
//    （该字段仅在成员被 filter/include-all 过滤为空时生效，见 groupbase.go）。
// 4. select 组改用 SELECT_BASE_OPTION（不再带 interval）：select 组一旦声明 interval，
//    内核会为它注册 CompatibleProvider + HealthCheck 定时器，每个成员被重复拨号。
//    实测（3 组 × 2 节点 × 3s）：带 interval = 24 次/8s，不带 = 仅 url-test 组的 6 次。
// 5. Apple Push 由 fallback 改 select + 默认 DIRECT：mihomo 的 fallback 永远返回首个 alive 成员，
//    而 DIRECT 恒为 alive，原 ["DIRECT","APNs-Fallback"] 等价于「永久直连」，回退分支从未生效。
// 6. GLOBAL 增加 default-selected=默认代理：select 缺省取成员列表首个，
//    原顺序首位是 hidden 的「国内直连」，切到全局模式会变成全局直连裸奔。
// 7. 新增 OPTIONS.OVERRIDE_PROXY_DNS：只补齐 dns.proxy-server-nameserver，
//    解决「节点域名解析失败 → Dial 超时」的大面积假超时，其余 DNS 仍尊重客户端。
// 8. 节点名与 mihomo 内置保留名（DIRECT/REJECT/PASS/COMPATIBLE/GLOBAL）冲突时自动改名，
//    否则内核直接报 proxy XXX is the duplicate name，整份配置加载失败。
// 9. 客户端未声明时补 unified-delay: true（实测 https 测速 2231ms → 308ms）：
//    https 测速的 TLS 握手会计入延迟（URLTest 的 start 在 DialContext 之前），
//    这正是「https 灵敏度差」的根因；unified-delay 用同连接第二条请求计时剥离握手，
//    兼得 https 的防劫持与 http 的低开销。
// ============================================================

// 运行时控制开关
const OPTIONS = {
  OVERRIDE_GROUPS: true,
  OVERRIDE_RULES: true,
  // 核心原则：默认由客户端界面控制底层网络，绝不在跨平台上越俎代庖
  // - false: 尊重客户端界面设置，保留客户端原生 tun / dns / sniffer（跨平台最佳实践）
  // - true: 强制使用脚本内置的高级底层参数（适合无 UI 的纯 CLI/网关环境）
  OVERRIDE_TUN: false,
  OVERRIDE_DNS: false,
  // 仅注入「节点服务器域名解析」相关字段（proxy-server-nameserver / default-nameserver），
  // 其余 dns 配置仍完全尊重客户端。网络波动导致的大面积"服务器超时"里，
  // 最常见的一条就是节点域名解析失败 → Dial 超时，而它与测速 URL 无关。
  OVERRIDE_PROXY_DNS: true,
  // 客户端未显式声明 unified-delay 时补 true：测速改为「同连接第二条请求计时」，
  // 把 TCP/TLS 握手从延迟里剥离。实测 https://www.gstatic.com/generate_204
  // 2231ms → 308ms（与 http:// 的 286ms 持平），且保留 HTTPS 的防劫持能力。
  // 客户端已声明该键时不动（尊重用户在 UI 里的选择）。
  ENSURE_UNIFIED_DELAY: true,
  OVERRIDE_SNIFFER: false,
  LOG_VERBOSE: true,
  // false 避免记住死节点（BettBox / Mihomo 最佳实践）
  STORE_SELECTED: false,
};

// 用户可调业务开关（BettBox 面板勾选联动）
const ruleOptionsEnable = {
  // === 地区与拓扑 ===
  手动选择: true,           // "手动选择"聚合组（引用各活跃地区组）
  生成地区自动选择组: true, // 各地区生成 url-test 子组（"XX-自动选择"）
  隐藏地区手动选择组: false, // true 时地区手动 select 组隐藏，仅留自动选择
  分流组添加所有节点: false, // true 时场景组直接引用全量节点而非策略组
  // === 节点过滤与安全 ===
  过滤非地区节点: true,      // 剔除无地区标识且命中营销噪音词的节点
  屏蔽国外QUIC: false,      // 拦截国外 QUIC 流量（UDP 443 非国内 REJECT）
  AdBlock: false,           // 广告拦截规则集
  // === 专线保障 ===
  ApplePush专线保障: true,  // 官方最佳实践：APNs 独立故障转移，直连优先 + 代理回退
  // === 7 大指定核心场景组（组 + 规则 + 规则集联动） ===
  AI: true,                 // ChatGPT / Claude / Gemini，默认优先美国
  Google: true,             // 谷歌生态，默认优先美国
  YouTube: true,            // YouTube 独立组，默认走默认代理（防 Google 规则误截）
  OneDrive: true,           // 微软网盘，国外走组（默认代理），国内段直连
  GitHub: true,             // GitHub 独立组，默认走默认代理（防 Microsoft 规则误截直连）
  Microsoft: true,          // 微软服务，默认国内直连
  Apple: true,              // 苹果生态，默认国内直连
};

// 图标资源库（通过 gh-proxy 镜像加速，国内高可靠直连）
const ICON_BASE = "https://v4.gh-proxy.org/https://raw.githubusercontent.com/cgoder/clash_rules/main/icons";
const ICON_QURE_BASE = "https://v4.gh-proxy.org/https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color";

const ICON = {
  Proxy: `${ICON_BASE}/Rocket.png`,
  Manual: `${ICON_BASE}/Rocket.png`,
  China: `${ICON_BASE}/China.png`,
  Other: `${ICON_BASE}/OT.png`,
  MATCH: `${ICON_BASE}/MATCH.png`,
  ApplePush: `${ICON_QURE_BASE}/Apple.png`,
  // 地区图标
  HK: `${ICON_BASE}/HK.png`,
  JP: `${ICON_BASE}/JP.png`,
  TW: `${ICON_BASE}/TW.png`,
  SG: `${ICON_BASE}/SG.png`,
  US: `${ICON_BASE}/US.png`,
  KR: `${ICON_QURE_BASE}/Korea.png`,
  UK: `${ICON_QURE_BASE}/United_Kingdom.png`,
  DE: `${ICON_QURE_BASE}/Germany.png`,
  FR: `${ICON_QURE_BASE}/France.png`,
  AU: `${ICON_QURE_BASE}/Australia.png`,
  // 7 大指定场景组图标
  AI: `${ICON_BASE}/ChatGPT.png`,
  Google: `${ICON_BASE}/Google.png`,
  YouTube: `${ICON_BASE}/YouTube.png`,
  OneDrive: `${ICON_BASE}/OneDrive.png`,
  GitHub: `${ICON_BASE}/GitHub.png`,
  Microsoft: `${ICON_BASE}/Microsoft.png`,
  Apple: `${ICON_BASE}/Apple.png`,
};

// 硬噪音节点：机场提示/剩余流量/到期节点，无论有无地区必丢（Anchor_PR filter 标准）
const INVALID_PROXY_RE = /剩余流量|距离下次重置|套餐到期|去除.*线路|跳转域名|请勿连接/;

// 软噪音关键词：仅在“无任何地区标识”时才过滤（带地区标识的有效节点永不丢）
const EXCLUDE_KEYWORD_RE = /群|返利|循环|官网|客服|网站|网址|获取|订阅|流量|到期|机场|下次|版本|官址|备用|过期|已用|联系|邮箱|工单|贩卖|通知|倒卖|防止|国内|地址|频道|电报|无法|说明|使用|提示|访问|支持|教程|关注|更新|作者|加入|超时|收藏|优惠|福利|邀请|好友|失联|选择|剩余|公益|发布|DIZTNA|通路|登录|禁止|定时|渠道|牢记|永久|余额|阁下|本站|刷新|导航|建议|重置|以下|⚠️|@|t\.me\/\+|\bexpire\b|\bhttps?:\/\/|\.com|\btraffic\b/iu;

// 10 大地区识别正则（环视写法，兼容前后数字、汉字或字母紧贴）
// ⚠️ 国家码不要用 `X?` 这种「可选尾字母」写法：
//    - `KOR?` 实际表示「K + O + 可选 R」，永远匹配不到韩国的 IATA/ISO 码 `KR`；
//    - `FRA?` 会同时吃掉法兰克福机场码 `FRA`，让德国节点被误判为法国。
//    因此一律显式列出 `KR|KOR`、`FR`（法国不含 FRA）、`DE|DEU|GER`。
// 另补齐订阅里高频出现的机场三字码，避免 `LAX01`/`NRT01`/`ICN01` 这类节点掉进「其他节点」。
const REGION_DEFINITIONS = [
  { name: "香港", code: "HK", flag: "🇭🇰", icon: ICON.HK, re: /(香港|🇭🇰|(?<![A-Za-z])(?:HK|HKG)(?![A-Za-z])|hong\s*kong)/i },
  { name: "日本", code: "JP", flag: "🇯🇵", icon: ICON.JP, re: /(日本|东京|大阪|京都|🇯🇵|(?<![A-Za-z])(?:JP|JPN|NRT|HND|KIX|NGO)(?![A-Za-z])|japan)/i },
  { name: "台湾", code: "TW", flag: "🇹🇼", icon: ICON.TW, re: /(台湾|台灣|台北|高雄|🇹🇼|(?<![A-Za-z])(?:TW|TWN|TPE|KHH)(?![A-Za-z])|taiwan)/i },
  { name: "新加坡", code: "SG", flag: "🇸🇬", icon: ICON.SG, re: /(新加坡|狮城|🇸🇬|(?<![A-Za-z])(?:SG|SGP|SIN)(?![A-Za-z])|singapore)/i },
  { name: "美国", code: "US", flag: "🇺🇸", icon: ICON.US, re: /(美国|美國|纽约|洛杉矶|旧金山|芝加哥|西雅图|硅谷|波士顿|华盛顿|🇺🇸|(?<![A-Za-z])(?:US|USA|LAX|SJC|SFO|SEA|JFK|ORD|IAD|ATL|DFW)(?![A-Za-z])|america|united\s*states)/i },
  { name: "韩国", code: "KR", flag: "🇰🇷", icon: ICON.KR, re: /(韩国|韓國|首尔|仁川|🇰🇷|(?<![A-Za-z])(?:KR|KOR|ICN|GMP)(?![A-Za-z])|korea|seoul)/i },
  { name: "英国", code: "UK", flag: "🇬🇧", icon: ICON.UK, re: /(英国|英國|伦敦|曼彻斯特|🇬🇧|(?<![A-Za-z])(?:UK|GB|GBR|LHR|LGW|MAN)(?![A-Za-z])|britain|united\s*kingdom)/i },
  { name: "德国", code: "DE", flag: "🇩🇪", icon: ICON.DE, re: /(德国|德國|法兰克福|柏林|慕尼黑|🇩🇪|(?<![A-Za-z])(?:DE|DEU|GER|FRA|MUC|BER)(?![A-Za-z])|germany|deutschland)/i },
  // 法国不含 FRA：订阅里的 FRA-01 基本都是法兰克福，留在德国正则里
  { name: "法国", code: "FR", flag: "🇫🇷", icon: ICON.FR, re: /(法国|法國|巴黎|🇫🇷|(?<![A-Za-z])FR(?![A-Za-z])|france)/i },
  { name: "澳大利亚", code: "AU", flag: "🇦🇺", icon: ICON.AU, re: /(澳大利亚|澳大利亞|澳洲|悉尼|墨尔本|🇦🇺|(?<![A-Za-z])(?:AU|AUS|SYD|MEL|BNE)(?![A-Za-z])|australia)/i },
];

// Emoji 国旗匹配正则
const FLAG_RE = /[\u{1F1E6}-\u{1F1FF}]{2}/u;

// 地区分类缓存：提升大批量节点正则匹配性能
const regionMatchCache = new Map();
// 全部命中（一个节点可能同时命中多个地区：`🇺🇸 香港 01`、`FRA 法兰克福`）
function classifyNodeAll(name) {
  const cached = regionMatchCache.get(name);
  if (cached) return cached;
  const matched = [];
  for (const reg of REGION_DEFINITIONS) {
    if (reg.re.test(name)) matched.push(reg.name);
  }
  regionMatchCache.set(name, matched);
  return matched;
}

// 单一归属判定：一个节点只能进一个地区组。
// 此前 `classifyNode` 返回全部命中，多命中节点会被同时塞进多个地区组
// （`🇺🇸 香港 01` → 香港组 + 美国组，`FRA 法兰克福` → 德国组 + 法国组），
// 每个组各自拨号测速，且用户在同一节点上看到两个互相矛盾的地区入口。
// 优先级：名称首位的国旗 > 无歧义的国家码（ISO/IATA）> 定义顺序。
// 与「是否带地区标识」解耦：识别不出的国家（土耳其/巴西）仍算有标识，
// 只是不会进入 10 大地区组，而是落到「其他节点」。
function classifyNode(name) {
  const all = classifyNodeAll(name);
  if (all.length === 0) return [];

  // 1) 国旗优先：取名称里第一个国旗，它能命中哪个地区就以哪个为准
  const flags = [...String(name).matchAll(new RegExp(FLAG_RE.source, "gu"))].map(m => m[0]);
  for (const flag of flags) {
    const hit = REGION_DEFINITIONS.find(r => r.flag === flag && all.includes(r.name));
    if (hit) return [hit.name];
  }

  // 2) 国家码优先（ASCII 字母码几乎不会误判，中文里的城市别名容易重叠）
  const asciiHit = name.match(/(?<![A-Za-z])[A-Za-z]{2,3}(?![A-Za-z])/g) || [];
  for (const token of asciiHit) {
    for (const reg of REGION_DEFINITIONS) {
      if (!all.includes(reg.name)) continue;
      if (!reg.re.test(token)) continue;
      // 该 token 只能被这一个地区命中时，视为无歧义的强信号
      const owners = REGION_DEFINITIONS.filter(r => r.re.test(token)).map(r => r.name);
      if (owners.length === 1) return [reg.name];
    }
  }

  // 3) 兜底：按定义顺序取第一个命中（中文城市名遵循 REGION_DEFINITIONS 的先后）
  return [all[0]];
}

// 「是否带地区标识」：国旗 / 国家码 / 中文地名都算，不再局限于 10 大地区。
// 这决定了 土耳其/巴西/印度 这类节点不会被营销词误杀（它们进不了 10 大地区组，
// 但应进「其他节点」组）。
// ⚠️ 不能只判断国旗和 ASCII 码：订阅里大量节点是纯中文名（`香港 01`、`土耳其 伊斯坦布尔`），
// 漏判会让「过滤非地区节点」把它们当成营销节点丢掉。
const CN_REGION_HINTS = [
  "香港", "台湾", "台灣", "澳门", "澳門", "日本", "东京", "大阪", "韩国", "韓國", "首尔",
  "新加坡", "狮城", "美国", "美國", "加拿大", "英国", "英國", "伦敦", "法国", "法國", "巴黎",
  "德国", "德國", "法兰克福", "荷兰", "荷蘭", "俄罗斯", "俄羅斯", "意大利", "西班牙", "瑞士",
  "瑞典", "挪威", "芬兰", "芬蘭", "波兰", "波蘭", "土耳其", "巴西", "阿根廷", "墨西哥", "智利",
  "印度", "印尼", "印度尼西亚", "越南", "泰国", "泰國", "马来西亚", "馬來西亞", "菲律宾",
  "菲律賓", "澳大利亚", "澳洲", "新西兰", "紐西蘭", "迪拜", "阿联酋", "以色列", "南非", "埃及",
  "乌克兰", "烏克蘭", "爱尔兰", "奥地利", "比利时", "丹麦", "捷克", "匈牙利", "罗马尼亚",
];
function hasAnyRegionMarker(name) {
  const s = String(name);
  if (FLAG_RE.test(s)) return true;
  // 独立成词的 2~3 位 ASCII 国家码/机场码：TR、BR、IN、`TR01`、`HK-01`
  // ⚠️ 不能匹配「数字+字母」的量词写法：`剩余流量 100GB` 里的 GB 是单位不是英国
  if (/(?<![A-Za-z0-9])[A-Z]{2,3}(?![A-Za-z])/.test(s) && !/\d[A-Z]{2,3}(?![A-Za-z])/.test(s)) return true;
  if (/(?<![A-Za-z0-9])[A-Z]{2,3}(?=[-\d])/.test(s)) return true;
  return CN_REGION_HINTS.some(hint => s.includes(hint));
}

// 节点名称归一化：补齐地区国旗、清洗连续多余空格
function normalizeProxyName(proxy) {
  const name = proxy.name;
  const existingFlag = name.match(FLAG_RE)?.[0];
  const cleanName = (existingFlag ? name.replace(existingFlag, "") : name).replace(/\s+/g, " ").trim();
  const matchedRegions = classifyNode(name);
  const targetFlag = existingFlag || REGION_DEFINITIONS.find(r => matchedRegions.includes(r.name))?.flag;
  // cleanName 可能为空（节点名只有国旗，如 `🇭🇰`）：此时不要拼出 `"🇭🇰 "` 这种带尾空格的畸形名
  const normalized = !cleanName ? (targetFlag || "") : (targetFlag ? `${targetFlag} ${cleanName}` : cleanName);
  return normalized === name ? proxy : { ...proxy, name: normalized };
}

// 直连节点仅使用 IPv4 网络栈
// ⚠️ 定义位置必须在 RESERVED_GROUP_NAMES 之前：该名字会被并入保留名集合，
// 否则订阅里出现同名节点时内核直接报 duplicate name（1.19.29 实测）。
const DIRECT_PROXIES = [
  { name: "DIRECT | 仅IPv4", type: "direct", "ip-version": "ipv4" },
];

// 保留策略组名称清单（防 Loop detected 自环）
const RESERVED_GROUP_NAMES = new Set([
  "GLOBAL", "默认代理", "手动选择", "国内直连", "漏网之鱼", "兜底自动选择", "其他节点",
  "Apple Push",
  ...REGION_DEFINITIONS.map(r => r.name),
  ...REGION_DEFINITIONS.map(r => `${r.name}-自动选择`),
  "AI", "Google", "YouTube", "OneDrive", "GitHub", "Microsoft", "Apple",
  "DIRECT", "REJECT", "REJECT-DROP", "PASS", "COMPATIBLE",
  // 脚本注入的直连代理名同样要保留，否则与订阅节点撞名 → duplicate name 加载失败
  ...DIRECT_PROXIES.map(p => p.name),
]);

// mihomo 内置保留名：这些名字在内核里已存在，节点同名会直接 `proxy XXX is the duplicate name`
// 导致整份配置加载失败（已用 mihomo 1.19.29 实测 DIRECT / REJECT 两种都会报错）
const BUILTIN_RESERVED_NAMES = new Set(["DIRECT", "REJECT", "REJECT-DROP", "PASS", "COMPATIBLE", "GLOBAL"]);

// 节点重命名防自环：节点名称不得与策略组同名，否则 Mihomo 将节点当作组引用引发自环崩溃
// 幂等：已经带 `节点` 后缀的名字不再重复追加（避免二次执行变成 `...节点节点`）
const RENAME_SUFFIX = "节点";
function renameIfCollidesWithGroup(name) {
  if (!RESERVED_GROUP_NAMES.has(name) && !BUILTIN_RESERVED_NAMES.has(name)) return name;
  if (name.endsWith(RENAME_SUFFIX)) return name;
  return `${name}${RENAME_SUFFIX}`;
}

// 策略组通用基础配置
// - url 用 HTTPS：80 端口明文 204 易被运营商透明缓存/DPI 干扰造成误判；
//   且 mihomo 的 unified-delay 二次请求在 http 下不可靠 —— 部分机场劫持测速地址、
//   不兼容 HEAD 二次请求，内核对 http 测速地址有专门告警
//   （adapter/adapter_entry.go：仅 unified-delay 开启时打印）。
// - lazy: true：仅在「距上次 touch 超过 interval」时跳过一轮，几乎不牺牲新鲜度，
//   却能避免长时间无人使用时仍常驻拨号（mihomo component/provider/healthcheck.go process 分支）。
// - empty-fallback: REJECT：该字段仅在成员列表被 filter/include-all 过滤成空时生效
//   （adapter/outboundgroup/groupbase.go GetProxies → len(proxies)==0）。
//   填 DIRECT 会让「本应走代理的境外流量」在组内无节点时静默直连撞 GFW，因此一律 REJECT。
const GROUP_BASE_OPTION = {
  interval: 300,
  timeout: 5000,
  url: "https://www.gstatic.com/generate_204",
  // 不设 expected-status（内核缺省 "*" = 任意状态码都算通）。
  // 若设为 "204" 可以识别「机场劫持测速地址」，但也会把返回 200 的劫持型机场全部判死，
  // 与「减少误判超时」的目标冲突，故保持默认。
  lazy: true,
  "max-failed-times": 3,
  "empty-fallback": "REJECT",
};

// select 组专用基础参数：select 组不参与自动测速，但一旦带 url/interval，
// mihomo 会为它注册 CompatibleProvider + HealthCheck 定时器
// （adapter/outboundgroup/parser.go：type != select/relay 才补 interval 缺省值，
//  但 url 非空时无条件 NewHealthCheck；interval 为 0 时该 provider 不会周期性 check），
// 每个成员都会被独立拨号探测一遍 —— 修订前 35 个组、每轮约 164 次探测就是这么来的。
// 实测对照（3 组 × 2 节点 × 3s）：带 interval = 24 次 / 8s；仅 url 无 interval = 6 次（只来自 url-test 组）。
// 因此 select 组只保留「面板手动测速」用的 url，不声明 interval。
const SELECT_BASE_OPTION = {
  url: GROUP_BASE_OPTION.url,
  timeout: GROUP_BASE_OPTION.timeout,
  // 与静态 YAML（clashmi.yml）保持同一套兜底语义：
  // select 组虽然不自动测速，但一旦成员被 include-all/filter 过滤为空，
  // 仍会走 empty-fallback，必须与地区 url-test 组同口径，避免静默直连。
  "empty-fallback": GROUP_BASE_OPTION["empty-fallback"],
};

// 地区 url-test 基础参数：纯本地区节点测速，宁断不叛逃
// tolerance 150：公网跨境延迟的天然抖动常达 30~80ms，50ms 会让组内出口高频乒乓，
// 每次切换都会拆掉现有 TCP/TLS 会话并让出口 IP 跳变（触发风控）。150ms 覆盖正常抖动。
const UT_BASE = {
  type: "url-test",
  tolerance: 150,
  ...GROUP_BASE_OPTION,
  hidden: true,
  "exclude-type": "DIRECT",
};

// 全局兜底故障转移组
const FALLBACK_GROUP_NAME = "兜底自动选择";
const FALLBACK_BASE = {
  type: "fallback",
  ...GROUP_BASE_OPTION,
  hidden: true,
  // 与 clashmi.yml 的 include-all 对齐：排除 direct 类型代理，
  // 否则 DIRECT | 仅IPv4 会参与拨号且可能被选中（direct 恒 alive）
  "exclude-type": "DIRECT",
};

// MetaCubeX MRS 规则集辅助生成器
const M = (file, behavior = "domain") => ({
  type: "http",
  interval: 86400,
  behavior,
  format: "mrs",
  url: `https://v4.gh-proxy.org/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/${file}.mrs`,
});
const MI = (file) => ({
  type: "http",
  interval: 86400,
  behavior: "ipcidr",
  format: "mrs",
  url: `https://v4.gh-proxy.org/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geoip/${file}.mrs`,
});
const MIG = (file) => ({
  type: "http",
  interval: 86400,
  behavior: "ipcidr",
  format: "mrs",
  url: `https://v4.gh-proxy.org/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo-lite/geoip/${file}.mrs`,
});

// 7 大核心场景服务定义（数据驱动，组 + 规则 + 规则集内聚）
// ⚠️ 规则顺序至关重要：
// 1. YouTube 必须在 Google 之前：geosite/google 包含 include:youtube，倒置会导致 YouTube 强制走美国
// 2. GitHub 必须在 Microsoft 之前：geosite/microsoft 包含 include:github，倒置会导致 GitHub 误走国内直连
const SERVICE_CONFIGS = [
  {
    sw: "AI",
    group: { name: "AI", icon: ICON.AI, def: "us" },
    rules: [
      "RULE-SET,openai_domain,AI",
      "RULE-SET,anthropic_domain,AI",
      "RULE-SET,google-gemini_domain,AI",
    ],
    providers: {
      openai_domain: M("openai"),
      anthropic_domain: M("anthropic"),
      "google-gemini_domain": M("google-gemini"),
    },
  },
  {
    sw: "YouTube",
    group: { name: "YouTube", icon: ICON.YouTube, def: "default" },
    rules: [
      "RULE-SET,youtube_domain,YouTube",
    ],
    providers: {
      youtube_domain: M("youtube"),
    },
  },
  {
    sw: "Google",
    group: { name: "Google", icon: ICON.Google, def: "us" },
    rules: [
      "RULE-SET,google_domain,Google",
      "RULE-SET,google_ip,Google,no-resolve",
    ],
    providers: {
      google_domain: M("google"),
      google_ip: MI("google"),
    },
  },
  {
    sw: "OneDrive",
    group: { name: "OneDrive", icon: ICON.OneDrive, def: "default" },
    rules: [
      "RULE-SET,onedrive_domain,OneDrive",
    ],
    providers: {
      onedrive_domain: M("onedrive"),
    },
  },
  {
    sw: "GitHub",
    group: { name: "GitHub", icon: ICON.GitHub, def: "default" },
    rules: [
      "RULE-SET,github_domain,GitHub",
    ],
    providers: {
      github_domain: M("github"),
    },
  },
  {
    sw: "Microsoft",
    group: { name: "Microsoft", icon: ICON.Microsoft, def: "国内直连" },
    rules: [
      "RULE-SET,microsoft_domain,Microsoft",
    ],
    providers: {
      microsoft_domain: M("microsoft"),
    },
  },
  {
    sw: "Apple",
    group: { name: "Apple", icon: ICON.Apple, def: "国内直连" },
    rules: [
      "RULE-SET,apple_domain,Apple",
      "RULE-SET,apple_ip,Apple,no-resolve",
    ],
    providers: {
      apple_domain: M("apple"),
      apple_ip: MIG("apple"),
    },
  },
];

// clashmi 核心规则集底座（国内高可用镜像）
const BASE_RULE_PROVIDERS = {
  // 局域网与私网
  private_domain: M("private"),
  private_ip: MI("private"),
  ntp_domain: M("category-ntp"),
  // 自定义本地/远程规则（clashmi 核心特色：my_proxy 含 SideStore 离线续签端点）
  my_proxy: {
    type: "http",
    interval: 86400,
    behavior: "classical",
    format: "text",
    url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/cgoder/clash_rules/main/rules/my_proxy.list",
  },
  my_direct: {
    type: "http",
    interval: 86400,
    behavior: "classical",
    format: "text",
    url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/cgoder/clash_rules/main/rules/my_direct.list",
  },
  // 国内直连加速（游戏/网盘/显卡驱动/大厂分流）
  games_cn: M("category-games@cn"),
  epicgames: M("epicgames"),
  nvidia_cn: M("nvidia@cn"),
  apple_cn: M("apple@cn"),
  microsoft_cn: M("microsoft@cn"),
  ResourceSite: {
    type: "http",
    interval: 86400,
    behavior: "classical",
    format: "text",
    url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/eulac-dev/Proxy/refs/heads/main/Shadowrocket/Rules/ResourceSite.list",
  },
  PanVod: {
    type: "http",
    interval: 86400,
    behavior: "classical",
    format: "text",
    url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/eulac-dev/Proxy/refs/heads/main/Shadowrocket/Rules/PanVod.list",
  },
  add_direct_domain: {
    type: "http",
    interval: 86400,
    behavior: "domain",
    format: "mrs",
    url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/Seven1echo/Yaml/refs/heads/main/rules/Seven1_Direct_Domain.mrs",
  },
  cn_domain: M("cn"),
  cn_ip: MI("cn"),
  geolocation_not_cn: M("geolocation-!cn"),
  gfw: M("gfw"),
  fakeip_filter: {
    type: "http",
    interval: 86400,
    behavior: "domain",
    format: "mrs",
    url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/wwqgtxx/clash-rules/release/fakeip-filter.mrs",
  },
  adblock: {
    type: "http",
    interval: 86400,
    behavior: "domain",
    format: "mrs",
    url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/217heidai/adblockfilters/main/rules/adblockmihomolite.mrs",
  },
};

// 构建策略组
function buildProxyGroups(allProxyNames) {
  const genAuto = ruleOptionsEnable["生成地区自动选择组"];
  const hideManual = ruleOptionsEnable["隐藏地区手动选择组"];
  const addAllNodes = ruleOptionsEnable["分流组添加所有节点"];

  // 1. 节点地区分类聚合
  const byRegion = new Map();
  const otherNodes = [];
  const existingAutoNames = [];

  for (const n of allProxyNames) {
    const regions = classifyNode(n);
    for (const r of regions) {
      if (!byRegion.has(r)) byRegion.set(r, []);
      byRegion.get(r).push(n);
    }
    if (regions.length === 0) otherNodes.push(n);
  }

  // 2. 动态构建活跃地区组（按需生成，无节点不生成）
  const groups = [];
  const activeRegionNames = [];
  for (const reg of REGION_DEFINITIONS) {
    const nodes = byRegion.get(reg.name) || [];
    if (nodes.length === 0) continue;
    const autoName = `${reg.name}-自动选择`;
    const selectProxies = [];
    if (genAuto) {
      groups.push({
        name: autoName,
        ...UT_BASE,
        proxies: [...nodes],
        icon: reg.icon,
      });
      selectProxies.push(autoName);
      existingAutoNames.push(autoName);
    }
    selectProxies.push(...nodes, FALLBACK_GROUP_NAME);
    groups.push({
      name: reg.name,
      type: "select",
      ...SELECT_BASE_OPTION,
      proxies: selectProxies,
      icon: reg.icon,
      "exclude-type": "DIRECT",
      ...(hideManual ? { hidden: true } : {}),
    });
    activeRegionNames.push(reg.name);
  }

  // 3. 其他节点组（捕获 10 大区之外的有效小众节点）
  // 恒定生成（即使为空）：clashmi.yml 是静态 YAML，无法预判订阅里是否有非地区节点，
  // 若此处按需生成、那边恒定生成，两份配置的组名集合就会漂移。
  // 空组由 SELECT_BASE_OPTION 的 empty-fallback: REJECT 兜住，不会静默直连。
  groups.push({
    name: "其他节点",
    type: "select",
    ...SELECT_BASE_OPTION,
    proxies: otherNodes,
    icon: ICON.Other,
    "exclude-type": "DIRECT",
  });
  activeRegionNames.push("其他节点");

  // 4. 核心系统聚合组
  const manualProxies = ruleOptionsEnable["手动选择"] ? [...activeRegionNames] : [];
  groups.unshift({
    name: "默认代理",
    type: "select",
    ...SELECT_BASE_OPTION,
    proxies: [...activeRegionNames, FALLBACK_GROUP_NAME],
    icon: ICON.Proxy,
  });
  groups.unshift({
    name: "手动选择",
    type: "select",
    ...SELECT_BASE_OPTION,
    proxies: manualProxies.length ? manualProxies : ["国内直连"],
    icon: ICON.Manual,
  });
  groups.unshift({
    name: "国内直连",
    type: "select",
    ...SELECT_BASE_OPTION,
    proxies: DIRECT_PROXIES.map(p => p.name),
    icon: ICON.China,
    hidden: true,
  });

  // 5. Apple Push（APNs）专用链路
  // 修正历史设计：原实现是「fallback + 顺序故障转移」，但 mihomo 的 fallback 永远返回
  // 成员列表里第一个 alive 的成员（adapter/outboundgroup/fallback.go findAliveProxy），
  // 而 DIRECT 在 mihomo 里恒为 alive（adapter/outboundgroup/groupbase.go onDialFailed
  // 对 Direct/Reject/Compatible 直接 return，不会置 false）。
  // 因此 ["DIRECT", "APNs-Fallback"] 的顺序实际等价于「永久 DIRECT」，代理回退分支从未生效。
  // 改用 select + 默认 DIRECT：语义诚实，用户也能在面板上手动切到代理回退。
  if (ruleOptionsEnable["ApplePush专线保障"]) {
    groups.push({
      name: "Apple Push",
      type: "select",
      ...SELECT_BASE_OPTION,
      // captive.apple.com 走 Apple 自己的 anycast，测的是「这条路对 Apple 是否可用」
      url: "https://captive.apple.com/hotspot-detect.html",
      icon: ICON.ApplePush,
      proxies: ["DIRECT", "默认代理", FALLBACK_GROUP_NAME],
      "default-selected": "DIRECT",
    });
  }

  // 6. 7 大指定场景组（数据驱动挂载）
  // P0-1：`分流组添加所有节点` 时成员是「裸节点名」，而 default-selected 是组名，
  // 两者一旦不匹配，mihomo 会静默回落到 proxies[0]（selector.go selectedProxy），
  // Microsoft/Apple 会从「国内直连」变成走第一个境外节点，AI 也不再优先美国。
  // 因此组引用与节点始终并存：组引用负责语义默认值，裸节点负责用户直选。
  const usName = activeRegionNames.includes("美国") ? "美国" : null;
  const standardSvcList = ["默认代理", "手动选择", "国内直连", ...(usName ? [usName] : []), FALLBACK_GROUP_NAME];
  const serviceProxies = addAllNodes
    ? [...new Set([...standardSvcList, ...allProxyNames])]
    : standardSvcList;

  const services = [];
  const serviceRules = [];
  const serviceProviders = {};

  for (const svc of SERVICE_CONFIGS) {
    if (!ruleOptionsEnable[svc.sw]) continue;
    const g = svc.group;
    let def = g.def === "us" ? usName : (g.def === "default" ? "默认代理" : g.def);
    // usName 缺失（订阅里没有美国节点）时，AI/Google 回落到默认代理而不是随便取首个成员
    if (g.def === "us" && !def) def = "默认代理";
    // 兜底断言：default-selected 必须是真实成员，否则等于没生效
    if (def && !serviceProxies.includes(def)) def = serviceProxies[0];
    services.push({
      name: g.name,
      type: "select",
      ...SELECT_BASE_OPTION,
      proxies: serviceProxies,
      icon: g.icon,
      ...(def ? { "default-selected": def } : {}),
    });
    serviceRules.push(...svc.rules);
    Object.assign(serviceProviders, svc.providers);
  }

  // 7. 整合全量策略组：GLOBAL + 核心三大组 + 地区组 + APNs组 + 7大场景组 + 漏网之鱼 + 兜底自动选择
  const allGroups = [
    ...groups,
    ...services,
    {
      name: "漏网之鱼",
      type: "select",
      ...SELECT_BASE_OPTION,
      proxies: ["默认代理", "手动选择", "国内直连", FALLBACK_GROUP_NAME],
      icon: ICON.MATCH,
      "default-selected": "默认代理",
    },
    {
      name: FALLBACK_GROUP_NAME,
      ...FALLBACK_BASE,
      proxies: allProxyNames,
    },
  ];

  // 顶层全局聚合入口（置顶首位）
  // ⚠️ select 组未指定 default-selected 时，mihomo 取成员列表第一个
  // （adapter/outboundgroup/selector.go selectedProxy → proxies[0]）。
  // 原实现把 hidden 的「国内直连」排在首位，客户端切到全局模式后会变成全局直连裸奔。
  allGroups.unshift({
    name: "GLOBAL",
    type: "select",
    ...SELECT_BASE_OPTION,
    proxies: ["默认代理", ...allGroups.map(g => g.name).filter(n => n !== "默认代理")],
    icon: ICON.Proxy,
    "default-selected": "默认代理",
  });

  return { groups: allGroups, serviceRules, serviceProviders };
}

// 构建规则体系（严格遵循官方最佳实践自上而下分流逻辑）
function buildRules(serviceRules) {
  // 1. 本地局域网与私有服务直连
  const rulesPrivate = [
    "RULE-SET,private_ip,国内直连,no-resolve",
    "RULE-SET,private_domain,国内直连",
    "RULE-SET,ntp_domain,国内直连",
  ];

  // 2. 对齐官方最佳实践：Apple Push（APNs）专线独立链路
  const targetApns = ruleOptionsEnable["ApplePush专线保障"] ? "Apple Push" : "国内直连";
  const rulesApplePush = [
    `DOMAIN-SUFFIX,push.apple.com,${targetApns}`,
    `DOMAIN-SUFFIX,push-apple.com.akadns.net,${targetApns}`,
    `DOMAIN-KEYWORD,apple.com.edgekey.net,${targetApns}`,
    `IP-CIDR,17.249.0.0/16,${targetApns},no-resolve`,
    `IP-CIDR,17.252.0.0/16,${targetApns},no-resolve`,
    `IP-CIDR,17.57.144.0/22,${targetApns},no-resolve`,
    `IP-CIDR,17.188.128.0/18,${targetApns},no-resolve`,
    `IP-CIDR,17.188.20.0/23,${targetApns},no-resolve`,
  ];

  // 3. Apple 登录/续签认证端点必须显式代理，不能只依赖远程 my_proxy 规则集
  //    （规则集下载失败、缓存未更新或客户端不支持 classical provider 时，不能回落到直连）
  const rulesAppleAuth = [
    "DOMAIN,gsa.apple.com,默认代理",
    "DOMAIN,developerservices2.apple.com,默认代理",
    "DOMAIN,gspe1-ssl.ls.apple.com,默认代理",
  ];

  // 4. 自定义规则优先（包含 SideStore 离线自续签端点，必须在 apple_cn 直连之前匹配）
  const rulesMy = [
    "RULE-SET,my_proxy,默认代理",
    "RULE-SET,my_direct,国内直连",
  ];

  // 5. 国内直连加速快路径
  const rulesCnFast = [
    "RULE-SET,games_cn,国内直连",
    "RULE-SET,epicgames,国内直连",
    "RULE-SET,nvidia_cn,国内直连",
    "RULE-SET,apple_cn,国内直连",
    "RULE-SET,microsoft_cn,国内直连",
    "DOMAIN,fsend.cn,国内直连",
    "DOMAIN,international-gfe.download.nvidia.com,国内直连",
    "DOMAIN-SUFFIX,hdslb.com,国内直连",
  ];

  // 5. 国内直连收尾
  const rulesCnTail = [
    "RULE-SET,ResourceSite,国内直连",
    "RULE-SET,PanVod,国内直连",
    "RULE-SET,add_direct_domain,国内直连",
    "RULE-SET,cn_domain,国内直连",
    "RULE-SET,cn_ip,国内直连,no-resolve",
  ];

  // 6. 协议过滤规则
  const rulesQuic = [
    "AND,((NETWORK,UDP),(DST-PORT,443),(NOT,((RULE-SET,cn_ip,no-resolve)))),REJECT",
  ];

  return [
    ...(ruleOptionsEnable.AdBlock ? ["RULE-SET,adblock,REJECT"] : []),
    ...rulesPrivate,
    ...rulesAppleAuth,
    ...rulesApplePush,
    ...rulesMy,
    ...rulesCnFast,
    ...serviceRules, // 7 大场景组规则
    ...rulesCnTail,
    ...(ruleOptionsEnable["屏蔽国外QUIC"] ? rulesQuic : []),
    "RULE-SET,gfw,默认代理",
    "MATCH,漏网之鱼",
  ];
}

// 节点解析器补丁（OPTIONS.OVERRIDE_PROXY_DNS）
// 背景：mihomo 用 proxy-server-nameserver 解析「节点服务器域名」，解析失败 → 该节点 Dial 超时，
// 表现为"服务器不可用"，与测速 URL 是否可达无关。多数订阅源不带这个字段。
// 社区与内核维护者共识（mihomo #2543）：至少要保证一条「可直连且能应答」的解析器始终可用，
// 因此这里同时给 DoH 与明文 UDP，并保留 system 作为最后兜底。
function buildProxyServerDnsPatch(clientDns) {
  const base = { ...(clientDns || {}) };
  if (base.enable !== true) return null; // DNS 未启用时该字段无效，交由 OVERRIDE_DNS 处理
  const hasOwn = Array.isArray(base["proxy-server-nameserver"]) && base["proxy-server-nameserver"].length > 0;
  if (hasOwn) return null; // 客户端/订阅已自带，不干预
  // 去重：避免 base 里已存在同名字段时出现重复键（对象展开会被后者覆盖，语义等价但日志更清晰）
  return {
    ...base,
    "proxy-server-nameserver": [
      "https://223.5.5.5/dns-query#DIRECT",
      "https://doh.pub/dns-query#DIRECT",
      "223.5.5.5",
      "119.29.29.29",
      "system",
    ],
    "default-nameserver": Array.isArray(base["default-nameserver"]) && base["default-nameserver"].length
      ? base["default-nameserver"]
      : ["223.5.5.5", "119.29.29.29", "system"],
  };
}

// 备用高级 DNS 与 Hosts（仅在 OPTIONS.OVERRIDE_DNS = true 时启用）
function buildDnsAndHosts() {
  const chinaDNS = ["223.5.5.5", "119.29.29.29"];
  const chinaDoh = ["https://223.5.5.5/dns-query#DIRECT"];
  const domesticDoh = ["https://doh.pub/dns-query", "https://dns.alidns.com/dns-query"];
  const foreignDohViaProxy = ["https://cloudflare-dns.com/dns-query#默认代理", "https://dns.google/dns-query#默认代理"];

  return {
    dns: {
      enable: true,
      ipv6: false,
      listen: "127.0.0.1:7874",
      "use-hosts": true,
      "use-system-hosts": true,
      "cache-algorithm": "arc",
      "enhanced-mode": "fake-ip",
      "fake-ip-range": "198.18.0.1/16",
      "fake-ip-filter": [
        "rule-set:private_domain",
        "rule-set:fakeip_filter",
        "rule-set:cn_domain",
        "+.lan",
        "+.local",
        "+.orb.local",
        "localhost",
        "*.home.arpa",
        "time.*.com",
        "ntp.*.com",
        "+.ntp.org",
        "+.pool.ntp.org",
        "captive.apple.com",
        "connectivitycheck.gstatic.com",
        "+.msftconnecttest.com",
        "+.msftncsi.com",
        "stun.*.*",
        "+.stun.playstation.net",
        "+.xboxlive.com",
        "+.speedtest.net",
      ],
      "default-nameserver": chinaDNS,
      "proxy-server-nameserver": [
        ...chinaDoh,
        "https://doh.pub/dns-query#DIRECT",
        "223.5.5.5",
        "119.29.29.29",
      ],
      nameserver: domesticDoh,
      "direct-nameserver": ["system", ...chinaDNS],
      "nameserver-policy": {
        "geosite:cn": chinaDNS[0],
        "rule-set:my_direct": chinaDNS[0],
        "rule-set:geolocation_not_cn": foreignDohViaProxy[0],
        "rule-set:my_proxy": foreignDohViaProxy[0],
        "+.orb.local": "system",
      },
    },
    hosts: {
      "cloudflare-dns.com": ["1.1.1.1", "1.0.0.1"],
      "dns.google": ["8.8.8.8", "8.8.4.4"],
      "services.googleapis.cn": ["services.googleapis.com"],
      "+.mcdn.bilivideo.com": ["0.0.0.0"],
      "+.mcdn.bilivideo.cn": ["0.0.0.0"],
      "+.edge.mountaintoys.cn": ["0.0.0.0"],
      "+.h2.smtcdns.net": ["0.0.0.0"],
    },
  };
}

// 备用高级 TUN 配置（仅在 OPTIONS.OVERRIDE_TUN = true 时启用）
function buildTunConfig() {
  return {
    enable: true,
    stack: "gvisor",
    mtu: 1300,
    "auto-route": true,
    "strict-route": false,
    "auto-redirect": true,
    "auto-detect-interface": true,
    "endpoint-independent-nat": true,
    "route-exclude-cidr": [
      "192.168.0.0/16",
      "10.0.0.0/8",
      "172.16.0.0/12",
      "100.64.0.0/10",
      "169.254.0.0/16",
    ],
    "loopback-address": ["10.7.0.1"],
    "dns-hijack": ["any:53", "tcp://any:53"],
  };
}

// 备用高级嗅探配置（仅在 OPTIONS.OVERRIDE_SNIFFER = true 时启用）
function buildSnifferConfig() {
  return {
    enable: true,
    "override-destination": true,
    "parse-pure-ip": true,
    "force-dns-mapping": true,
    sniff: {
      QUIC: { ports: [443, 8443] },
      TLS: { ports: [443, 8443] },
      HTTP: { ports: [80, "8080-8880"], "override-destination": true },
    },
    "force-domain": [
      "+.netflix.com",
      "+.nflxvideo.net",
      "+.googlevideo.com",
      "+.youtube.com",
      "+.telegram.org",
      "+.t.me",
      "+.twitter.com",
      "+.twimg.com",
      "+.tiktok.com",
      "+.amazonaws.com",
    ],
    "skip-domain": [
      "+.apple.com",
      "Mijia Cloud",
      "dlg.io.mi.com",
      "+.oray.com",
      "+.sunlogin.net",
    ],
  };
}

// 节点过滤与归一化管道
function filterAndNormalizeProxies(proxies) {
  regionMatchCache.clear();
  const validProxies = [];
  const seenNames = new Set();
  // P0-2：记录「旧名 → 新名」，改名后要同步回写 dialer-proxy 引用，
  // 否则订阅里 A 节点用 B 节点中转时，B 一旦被归一化/改名，内核直接
  // `proxy [A] dialer-proxy [旧名] not found` 整份配置加载失败（1.19.29 实测）。
  const renameMap = new Map();
  // P0-4：脚本自身会注入 DIRECT_PROXIES，同名订阅节点必须让路，
  // 否则内核报 `proxy DIRECT | 仅IPv4 is the duplicate name`。
  for (const p of DIRECT_PROXIES) seenNames.add(p.name);

  for (const p of (proxies || [])) {
    if (!p || typeof p !== "object" || !p.name) continue;
    const normalized = normalizeProxyName(p);
    const name = renameIfCollidesWithGroup(normalized.name);

    // 硬噪音清洗（剩余流量/到期等，带地区也必丢）
    if (INVALID_PROXY_RE.test(name)) continue;

    // 软噪音过滤：仅「完全没有任何地区标识」时才按营销词过滤。
    // P0-3：原来用 classifyNode().length > 0 判断，而它只认 10 大地区，
    // 导致 `🇹🇷 土耳其 官网`、`🇧🇷 巴西 优惠` 这类带国旗的有效节点被当成垃圾丢光，
    // 「其他节点」组也因此永远建不出来。改为只认国旗/国家码的地区标识。
    if (ruleOptionsEnable["过滤非地区节点"] && !hasAnyRegionMarker(name) && EXCLUDE_KEYWORD_RE.test(name)) {
      continue;
    }

    // 去重：同名节点不再静默丢弃，改为追加序号保留（订阅里常见 `香港 01` 重复两条），
    // 静默丢弃会让用户以为节点没生效且无从排查。
    let finalName = name;
    if (seenNames.has(finalName)) {
      let i = 2;
      while (seenNames.has(`${name} #${i}`)) i++;
      finalName = `${name} #${i}`;
    }
    seenNames.add(finalName);
    if (finalName !== p.name) renameMap.set(p.name, finalName);
    validProxies.push(finalName === p.name ? p : { ...p, name: finalName });
  }

  if (validProxies.length === 0) {
    throw new Error("clash.js: 配置文件中未找到任何可用代理节点，请检查订阅源");
  }

  // P0-2：级联改写 dialer-proxy。一次遍历不一定够（A→B→C 里 B 也可能被改名），
  // 采用「直到不再变化」的定点迭代；同时把指向内置 DIRECT/REJECT 的引用保留原样。
  const resolvable = new Set([...validProxies.map(p => p.name), ...BUILTIN_RESERVED_NAMES]);
  for (let i = 0; i < 5; i++) {
    let changed = false;
    for (const p of validProxies) {
      const dp = p["dialer-proxy"];
      if (!dp || typeof dp !== "string" || resolvable.has(dp)) continue;
      if (renameMap.has(dp)) {
        p["dialer-proxy"] = renameMap.get(dp);
        changed = true;
      }
    }
    if (!changed) break;
  }
  // 仍然指向不存在节点的引用：删掉该字段，避免内核直接判定配置失败
  for (const p of validProxies) {
    const dp = p["dialer-proxy"];
    if (dp && typeof dp === "string" && !resolvable.has(dp)) {
      console.log(`⚠️ ${p.name} 的 dialer-proxy 指向不存在的节点「${dp}」，已移除该字段`);
      delete p["dialer-proxy"];
    }
  }

  return validProxies;
}

// ===== 主入口函数 =====
function main(config) {
  const log = (...args) => OPTIONS.LOG_VERBOSE && console.log(...args);
  log("⚡ clash.js — 工业级 Mihomo/Clash 预处理脚本执行中...");

  try {
    // 继承客户端自身的平台网络与系统设置（严守安全与平台管理边界）
    const newConfig = { ...config };
    newConfig["mode"] = "rule";

    // 0. 顶层测量口径：unified-delay 只在客户端未声明时补齐（merge 语义，不覆盖 UI 选择）
    if (OPTIONS.ENSURE_UNIFIED_DELAY && newConfig["unified-delay"] === undefined) {
      newConfig["unified-delay"] = true;
    }

    // 1. 节点过滤治理与去重归一化
    const filteredProxies = filterAndNormalizeProxies(config && config.proxies);
    const allProxyNames = filteredProxies.map(p => p.name);
    log(`✨ 有效节点治理完成: ${allProxyNames.length}/${(config.proxies || []).length}`);

    // 2. 构建策略组与规则
    let { groups: proxyGroups, serviceRules, serviceProviders } = buildProxyGroups(allProxyNames);

    // 3. 空组治理
    // 不再删除空组：clashmi.yml 是静态 YAML，组名集合固定，若这里按需删除，
    // 两份配置的组结构就会漂移。空组成员由各组的 empty-fallback（REJECT）兜住，
    // 内核不会报错，也不会静默直连。
    // 唯一需要处理的是「引用了空组」的组：把空组成员名剔掉，避免用户选到不可用出口。
    const emptyGroups = new Set(proxyGroups.filter(g => !g.proxies || g.proxies.length === 0).map(g => g.name));
    if (emptyGroups.size > 0) {
      log(`ℹ️ 空组（已用不会命中的占位成员兜底）: ${[...emptyGroups].join("、")}`);
      for (const g of proxyGroups) {
        if (!Array.isArray(g.proxies)) continue;
        const kept = g.proxies.filter(p => !emptyGroups.has(p));
        g.proxies = kept;
      }
      // 内核要求 proxies/use 至少有一项非空，否则 errMissProxy 整份配置加载失败。
      // 而空组又不能补 DIRECT（等于绕过 empty-fallback 静默直连）；
      // 这里补一个「永远不可用」的 REJECT 占位：组本身仍由 empty-fallback 决定去向，
      // 只有当用户手动切到这个空组时才会命中 REJECT（语义上等同于「无出口」）。
      for (const name of emptyGroups) {
        const g = proxyGroups.find(x => x.name === name);
        if (g && (!g.proxies || g.proxies.length === 0)) {
          g.proxies = ["REJECT"];
          g["empty-fallback"] = "REJECT";
        }
      }
    }

    newConfig["proxies"] = [...DIRECT_PROXIES, ...filteredProxies];
    newConfig["proxy-groups"] = proxyGroups;

    // 4. 规则集整合与开关控制
    const allProviders = { ...BASE_RULE_PROVIDERS, ...serviceProviders };
    if (!ruleOptionsEnable.AdBlock) delete allProviders.adblock;
    newConfig["rule-providers"] = OPTIONS.OVERRIDE_RULES
      ? allProviders
      : { ...(config["rule-providers"] || {}), ...allProviders };

    newConfig["rules"] = OPTIONS.OVERRIDE_RULES
      ? buildRules(serviceRules)
      : [...buildRules(serviceRules), ...(config.rules || [])];

    // 5. TUN 模式（遵守最佳实践：默认完全交由客户端界面按当前系统环境控制）
    if (OPTIONS.OVERRIDE_TUN) {
      newConfig["tun"] = buildTunConfig();
    } else {
      // 尊重客户端原有 tun 设置，若客户端未设则不注入，绝不在底层写死 enable: true
      if (config && config.tun) newConfig["tun"] = config.tun;
    }

    // 6. DNS 模式（遵守最佳实践：默认交由客户端界面配置控制）
    if (OPTIONS.OVERRIDE_DNS) {
      const { dns, hosts } = buildDnsAndHosts();
      newConfig["dns"] = dns;
      newConfig["hosts"] = hosts;
    } else {
      // 保持客户端原生 DNS；仅在原始完全未设时保持现状
      if (config && config.dns) newConfig["dns"] = config.dns;
      if (config && config.hosts) newConfig["hosts"] = config.hosts;
      // 只补齐节点解析器：不覆盖客户端的 nameserver / fake-ip / nameserver-policy
      if (OPTIONS.OVERRIDE_PROXY_DNS) {
        const patch = buildProxyServerDnsPatch(config && config.dns);
        if (patch) {
          newConfig["dns"] = patch;
          log("🔧 已补齐 dns.proxy-server-nameserver（双 DoH + UDP + system 兜底）");
        } else if (!(config && config.dns && config.dns.enable)) {
          log("⚠️ 客户端 DNS 未启用（dns.enable != true）：节点域名将走系统解析，波动时易出现 Dial 超时。请在客户端开启 DNS，或把 OVERRIDE_DNS 设为 true。");
        }
      }
    }

    // 7. Sniffer 嗅探（由客户端配置决定或按需覆盖）
    if (OPTIONS.OVERRIDE_SNIFFER) {
      newConfig["sniffer"] = buildSnifferConfig();
    } else {
      if (config && config.sniffer) newConfig["sniffer"] = config.sniffer;
    }

    log(`✅ 配置生成成功: ${newConfig.proxies.length} 节点 | ${newConfig["proxy-groups"].length} 策略组 | ${newConfig.rules.length} 规则`);
    return newConfig;
  } catch (error) {
    console.log(`❌ clash.js 执行异常: ${error.message}\n${error.stack}`);
    throw error;
  }
}
