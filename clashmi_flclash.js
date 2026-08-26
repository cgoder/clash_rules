// 适配 BettBox 自定义配置参数（保持与 mihomoScript.js 一致）
// ⚠️ 必须位于文件前 2000 字符内：BettBox 仅检查 head.substring(0,2000) 是否含
//    'Compatible_With_Bettbox'（lib/models/common.dart isCompatibleWithBettbox），
//    否则策略组面板不显示 ruleOptionsEnable 开关菜单
const Compatible_With_Bettbox = { ruleOptionsEnable: true };

// ============================================================
// 🔧 clashmi.yml → BettBox JS Override  v3.1  (基于 mihomoScript.js 重构)
// ⏰ 更新时间: 2026-08-25 18:35:00 CST
//
// v3.1 变更（地区分组锁死：全挂宁断不叛逃，兜底仅手动，同 clashmi_lite.js v1.6）：
// - 根因：健康检测实验（本地 mihomo + 波动 mock）证明——lazy:false 持续检查时节点
//   检查失败即判死（max-failed-times 只影响补测，不影响判死），地区节点经历共同链路
//   波动时全部判死，v3.0 的 fallback 包装层切到全局兜底 → 美国流量打到日本；
//   且 fallback 引用 url-test 组的判定行为本身不可靠（mihomo #2452）
// - 修复：删除 XX速度优先-auto + fallback 包装，XX速度优先 回归纯节点 url-test；
//   兜底自动选择 加入 op 聚合列表（手动选项）；地区全挂 → 连接失败（宁断不叛逃），
//   恢复后自动切回；兜底组改为无条件生成（被 op/漏网之鱼引用，不再依赖 genUt）
// - 健康参数：timeout 2000→5000（减少链路波动误判，社区建议值）
//
// v3.0 变更（修复地区速度优先组"低延迟叛逃"，同 clashmi_lite.js v1.5）：
// - 根因：XX速度优先（url-test）成员里直接挂了全局兜底组，url-test 选"最快候选"
//   不区分地区——兜底组当前节点（如日本）更快或本地区节点稍慢时，美国流量叛逃日本
// - 修复：XX速度优先-auto（hidden url-test）= 纯本地区节点；
//   XX速度优先（hidden fallback）= [XX速度优先-auto, 兜底自动选择]，本地区有活节点
//   走本地区最快，全挂才切全局兜底；聚合列表（一键代理等）引用名不变
//
// v2.9 变更（修复 GitHub 被 microsoft_domain 规则集截走导致直连）：
// - 根因：MetaCubeX geosite/microsoft 分类 include 了全部 github 域名（v2fly
//   domain-list-community microsoft 首行 include:github），RULE-SET,microsoft_domain
//   会命中 api.github.com/github.githubassets.com 等，而 Microsoft 组默认国内直连
//   → GitHub 国内无法访问（日志实证: dial Microsoft match RuleSet/microsoft_domain --> api.github.com）
// - 修复：对齐 mihomoScript.js（其 Microsoft 服务单独配 RULE-SET,github,默认代理），
//   github_domain 规则独立前置（优先于 microsoft 规则）→ 一键代理；
//   github_domain 规则集从 Google 服务移入 RULE_PROVIDERS_BASE（常驻，不受开关影响）
//
// v2.8 变更（吸收 mihomoScript.js 架构优点）：
// - 数据驱动 serviceConfigs：一个服务 = 组+规则+规则集 单点定义，删除 PROVIDER_BY_SWITCH/SUB_SWITCH
// - normalizeProxyName 国旗标准化 + regionMatchCache 正则缓存（参考配置节点治理管道）
// - GLOBAL 全量聚合组（参考配置主入口，BettBox 主开关）
// - DNS 增强：use-hosts/use-system-hosts/cache-algorithm arc/direct-nameserver/
//   fake-ip-filter 规则集级条目（rule-set:private_domain/fakeip_filter/cn_domain）
// - exclude-type DIRECT（UT/LB 测速排除直连）；hosts 多 IP 数组兑底
//
// v2.7 变更（修复 DNS 全断，同 clashmi_lite.js v1.2）：
// - 默认 nameserver 改用国内直连 DoH（doh.pub/dns.alidns.com），国外域名仍走代理 DoH；
// - nameserver-policy 增加 rule-set:my_direct → 223.5.5.5（直连域名国内解析防死锁）
//
// v2.6 变更（修复 BettBox 面板不显示 ruleOptionsEnable 菜单）：
// - 根因：BettBox 源码仅检查脚本前 2000 字符是否含 'Compatible_With_Bettbox'
//   (lib/models/common.dart isCompatibleWithBettbox)，v2.1 起头部 changelog 渐长
//   把该标记挤出 2000 字符窗口 → 面板开关菜单消失
// - 修复：将 Compatible_With_Bettbox 移到文件首行（任何版本注释增长都不再影响）
//
// v2.5 变更（修复 ruleOptionsEnable 开关全部失效的问题）：
// - 服务组开关 AI/Media/Telegram/Google/Microsoft/Apple/金融 真正驱动 组+规则+规则集
// - 负载均衡/自动选择/手动选择 控制地区组生成；生成地区自动选择组 与 自动选择 同义
// - 隐藏地区手动选择组 / 分流组添加所有节点 / 过滤非地区节点 / 屏蔽国外QUIC 生效
// - Twitter/TikTok/Spotify 作为子开关控制对应规则是否进入 通信/流媒体 组
// - 新增"金融"开关（paypal）；FCM/Steam 等 clashmi 无对应结构的键保留为兼容无效
//
// v2.4 变更（合并 mihomoScript.js 参考源的国内直连加速）：
// - games_cn/epicgames/nvidia_cn/apple_cn/microsoft_cn 规则集 + fsend.cn/nvidia下载/hdslb.com 直连
// - 依据：这些在参考源 mihomoScript.js 中存在 → 合并；sharepoint 直连、MS/Apple DoH 直连
//   DNS 在参考源中不存在 → 不合并（clashmi 的 OneDrive/MS 组本就 LD 直连优先，已覆盖 sharepoint）
//
// v2.3 变更（合并 flclash_override.js v4.0 亮点）：
// - 动态地域组：仅生成有节点的活跃地区/大洲组，避免空组与引用悬空
// - Info 组：被过滤的噪音节点保留在单独组，不丢弃（可手动选用）
// - AI 排除香港：ChatGPT/Claude/Gemini 出站列表剔除香港组
// - store-selected 开关（OPTIONS.STORE_SELECTED，默认 false 避免记住死节点）
//
// v2.2 变更（自动选择组故障转移优化）：
// - 健康检查调优：interval 300s 常驻（lazy: false）+ timeout 2000ms + max-failed-times 2
//   解决节点全挂时 url-test 粘死、每次连接超时刷屏的问题
// - 新增“兜底自动选择”fallback 组（顺序故障转移）：各“XX速度优先”组末尾追加兜底成员，
//   地区节点全挂时自动切到任意活节点（clashmi.yml 缺 failover，本版补齐）
//
// v2.1 变更（吸收 mihomoScript.js 优秀设计）：
// - 区域正则升级：\bHK\b → (?<![A-Za-z])HKG?(?![A-Za-z]) 环视写法（兼容 HK01/东京JP 紧贴写法），
//   并补充城市级关键词（美 11 城 / 日 3 城 / 台 2 城 / 新加坡狮城）
// - TUN 增强：mtu / endpoint-independent-nat / route-exclude-cidr / loopback-address（clashmi.yml 细节）
// - Sniffer 全量开启（clashmi.yml force/skip-domain），受 OPTIONS.OVERRIDE_SNIFFER 控制
// - 新增 gfw 兜底规则：未命中业务规则的被墙域名走一键代理
// - hosts 优化：屏蔽 B 站 PCDN（mcdn.bilivideo.com 等 → 0.0.0.0）、修复谷歌商店下载
// - 多版本直连：国内直连 组提供 双栈/IPv4优先/IPv6优先/仅IPv4/仅IPv6 五个 direct 节点
// - AdBlock：接入 adblockmihomolite 规则集（ruleOptionsEnable.AdBlock 控制，默认关）
// 适配 BettBox (FlClash 二次开发) 的 Dart/Go 双重校验
// - 修复 Dart: _Map<String,dynamic> is not subtype of String / Map<String,dynamic>
//   原因：原脚本直接 `config[k]=CORE_CONFIG[k]` 导致 BettBox 的 Dns/Tun/Sniffer
//   safeFromJson 旁路失败后，getConfig 仍以错误类型回填；且 dns.nameserver-policy
//   误用 List<String>（BettBox 期望 Map<String,String>）
// - 修复 Go: proxy group use or proxies missing
//   原因：空地域组仍以 proxies:[] 写入，mihomo parser.go 直接抛错
// - 参照：https://raw.githubusercontent.com/AIsouler/MyClash/main/Script/mihomoScript.js
//   采用 newConfig = {} 全量重建 + filterAndNormalizeProxies + buildDnsAndHostsConfig
// ============================================================

// 用户可调开关（映射到 mihomoScript.js 的 ruleOptionsEnable）
const OPTIONS = {
  OVERRIDE_GROUPS: true,
  OVERRIDE_RULES: true,
  OVERRIDE_DNS: true,
  OVERRIDE_TUN: true,
  OVERRIDE_SNIFFER: true,
  LOG_VERBOSE: true,
  // flclash v4.0 合并：false 避免记住死节点（BettBox 推荐）
  STORE_SELECTED: false,
};

// 用户可调开关（真正驱动组/规则/规则集的生成；键名保持 mihomoScript.js 兼容）
const ruleOptionsEnable = {
  // === 核心出站结构 ===
  手动选择: true,   // 大洲手动组（亚洲/欧洲/美洲/其他手动）；false 时核心"手动选择"组退化为国内直连
  自动选择: true,   // 地区"XX速度优先"（url-test）组
  负载均衡: true,   // 地区"XX负载均衡"（load-balance）组
  生成地区自动选择组: true, // mihomoScript 兼容键：与"自动选择"同义
  隐藏地区手动选择组: false, // true 时大洲手动组 hidden
  分流组添加所有节点: false, // true 时服务组直接引用全部节点而非组引用
  // === 服务组（联动 组+规则+规则集）===
  AI: true,        // ChatGPT/Claude/Gemini
  Media: true,     // 流媒体（youtube/netflix/tiktok/disney/spotify/appletv）
  Telegram: true,  // 通信（telegram + twitter，twitter 由 Twitter 子开关控制）
  Google: true,    // 云服务（google/github/speedtest）
  Microsoft: true, // Microsoft/OneDrive
  Apple: true,     // Apple
  金融: true,      // 金融（paypal）
  // === 子开关（并入对应组，false 时仅移除对应规则）===
  Twitter: true,   // 通信组是否含 twitter 规则
  TikTok: true,    // 流媒体组是否含 tiktok 规则
  Spotify: true,   // 流媒体组是否含 spotify 规则
  // === 功能开关 ===
  AdBlock: false,  // 广告拦截（adblock 规则集 + REJECT 置顶）
  过滤非地区节点: true, // 过滤无地区标识的节点（进 Info 组）
  屏蔽国外QUIC: false, // 屏蔽国外 QUIC（UDP 443 非国内 REJECT）
  // === clashmi 结构不支持的 mihomoScript 开关（改 true 无效，保留兼容）===
  FCM: false, Steam: false, Emby: false, PikPak: false, Crypto: false, EHentai: false,
  生成倍率组: false, 过滤高倍率节点: false, 代理IPV4优先: false, 代理IPV6优先: false, 链式代理: false,
};

// 图标（gh-proxy + raw 直链，国内可达）
// 勿用 github.com/.../raw/... 路径：gh-proxy 需跟随 302 跳转才能到 raw.githubusercontent.com，
// 部分实现跟随失败导致图标 404；raw 直链无跳转更可靠（clashmi_lite.js v1.1 同款修复）
const ICON_BASE = "https://v4.gh-proxy.org/https://raw.githubusercontent.com/cgoder/clash_rules/main/icons";
const ICON = {
  Rocket: `${ICON_BASE}/Rocket.png`,
  China: `${ICON_BASE}/China.png`,
  HK: `${ICON_BASE}/HK.png`,
  TW: `${ICON_BASE}/TW.png`,
  SG: `${ICON_BASE}/SG.png`,
  JP: `${ICON_BASE}/JP.png`,
  US: `${ICON_BASE}/US.png`,
  ChatGPT: `${ICON_BASE}/ChatGPT.png`,
  Claude: `${ICON_BASE}/Claude.png`,
  Gemini: `${ICON_BASE}/Gemini.png`,
  Netflix: `${ICON_BASE}/Netflix.png`,
  Telegram: `${ICON_BASE}/Telegram.png`,
  GitHub: `${ICON_BASE}/GitHub.png`,
  PayPal: `${ICON_BASE}/PayPal.png`,
  Microsoft: `${ICON_BASE}/Microsoft.png`,
  OneDrive: `${ICON_BASE}/OneDrive.png`,
  Apple: `${ICON_BASE}/Apple.png`,
  MATCH: `${ICON_BASE}/MATCH.png`,
  AS: `${ICON_BASE}/AS.png`,
  EU: `${ICON_BASE}/EU.png`,
  AM: `${ICON_BASE}/AM.png`,
  OT: `${ICON_BASE}/OT.png`,
  Available: `${ICON_BASE}/Available.png`,
};

// 无效节点正则（等价 Anchor_PR filter + mihomoScript.js 的 excludeFilter）
const INVALID_PROXY_RE = /剩余流量|距离下次重置|套餐到期|去除.*线路|跳转域名|请勿连接/;
const excludeFilter = /群|返利|循环|官网|客服|网站|网址|获取|订阅|流量|到期|机场|下次|版本|官址|备用|过期|已用|联系|邮箱|工单|贩卖|通知|倒卖|防止|国内|地址|频道|电报|无法|说明|使用|提示|访问|支持|教程|关注|更新|作者|加入|超时|收藏|优惠|福利|邀请|好友|失联|选择|剩余|公益|发布|DIZTNA|通路|登录|禁止|定时|渠道|牢记|永久|余额|阁下|本站|刷新|导航|建议|重置|以下|⚠️|@|t\.me\/\+|\bexpire\b|\bhttps?:\/\/|\.com|\btraffic\b/iu;

// 区域正则（与 clashmi.yml Anchor_HK/TW/SG/JP/US/AS/EU/AM/OT 1:1）
// 区域正则（mihomoScript.js 环视写法：兼容 HK01/东京JP 等紧贴写法；\b 对数字/汉字邻接会失效）
// 城市级关键词与 mihomoScript.js 对齐：美 11 城 / 日 3 城 / 台 2 城 / 新加坡狮城
const RE = {
  HK: /(香港|🇭🇰|(?<![A-Za-z])HKG?(?![A-Za-z])|hong\s*kong)/i,
  TW: /(台湾|台灣|台北|高雄|🇹🇼|(?<![A-Za-z])TWN?(?![A-Za-z])|taiwan)/i,
  SG: /(新加坡|狮城|🇸🇬|(?<![A-Za-z])SGP?(?![A-Za-z])|singapore)/i,
  JP: /(日本|东京|大阪|京都|🇯🇵|(?<![A-Za-z])JPN?(?![A-Za-z])|japan)/i,
  US: /(美国|美國|纽约|洛杉矶|旧金山|芝加哥|休斯顿|迈阿密|西雅图|波士顿|华盛顿|拉斯维加斯|圣何塞|圣地亚哥|🇺🇸|(?<![A-Za-z])USA?(?![A-Za-z])|america|united\s*states)/i,
  AS: /(香港|台湾|台灣|台北|高雄|新加坡|狮城|日本|东京|大阪|京都|韩国|韓國|印度|泰国|泰國|马来西亚|馬來西亞|菲律宾|菲律賓|越南|印尼|印度尼西亚|🇭🇰|🇹🇼|🇸🇬|🇯🇵|🇰🇷|🇮🇳|🇹🇭|🇲🇾|🇵🇭|🇻🇳|🇮🇩|(?<![A-Za-z])HKG?(?![A-Za-z])|(?<![A-Za-z])TWN?(?![A-Za-z])|(?<![A-Za-z])SGP?(?![A-Za-z])|(?<![A-Za-z])JPN?(?![A-Za-z])|(?<![A-Za-z])KR(?![A-Za-z])|(?<![A-Za-z])KOR(?![A-Za-z])|(?<![A-Za-z])IN(?![A-Za-z])|(?<![A-Za-z])TH(?![A-Za-z])|(?<![A-Za-z])MY(?![A-Za-z])|(?<![A-Za-z])PH(?![A-Za-z])|(?<![A-Za-z])VN(?![A-Za-z])|(?<![A-Za-z])ID(?![A-Za-z])|hong\s*kong|taiwan|singapore|japan|korea|india|thailand|malaysia|philippines|vietnam|indonesia)/i,
  EU: /(德国|德國|英国|英國|法国|法國|荷兰|荷蘭|瑞士|意大利|義大利|西班牙|芬兰|芬蘭|瑞典|挪威|丹麦|比利时|奥地利|波兰|罗马尼亚|羅馬尼亞|捷克|葡萄牙|希腊|匈牙利|爱尔兰|俄罗斯|俄羅斯|土耳其|🇩🇪|🇬🇧|🇫🇷|🇳🇱|🇨🇭|🇮🇹|🇪🇸|🇫🇮|🇸🇪|🇳🇴|🇩🇰|🇧🇪|🇦🇹|🇵🇱|🇷🇴|🇨🇿|🇵🇹|🇬🇷|🇭🇺|🇮🇪|🇷🇺|🇹🇷|(?<![A-Za-z])DE(?![A-Za-z])|(?<![A-Za-z])GB(?![A-Za-z])|(?<![A-Za-z])UK(?![A-Za-z])|(?<![A-Za-z])FR(?![A-Za-z])|(?<![A-Za-z])NL(?![A-Za-z])|(?<![A-Za-z])CH(?![A-Za-z])|(?<![A-Za-z])IT(?![A-Za-z])|(?<![A-Za-z])ES(?![A-Za-z])|(?<![A-Za-z])FI(?![A-Za-z])|(?<![A-Za-z])SE(?![A-Za-z])|(?<![A-Za-z])NO(?![A-Za-z])|(?<![A-Za-z])DK(?![A-Za-z])|(?<![A-Za-z])BE(?![A-Za-z])|(?<![A-Za-z])AT(?![A-Za-z])|(?<![A-Za-z])PL(?![A-Za-z])|(?<![A-Za-z])RO(?![A-Za-z])|(?<![A-Za-z])CZ(?![A-Za-z])|(?<![A-Za-z])PT(?![A-Za-z])|(?<![A-Za-z])GR(?![A-Za-z])|(?<![A-Za-z])HU(?![A-Za-z])|(?<![A-Za-z])IE(?![A-Za-z])|(?<![A-Za-z])RU(?![A-Za-z])|(?<![A-Za-z])TR(?![A-Za-z])|germany|britain|france|netherlands|switzerland|italy|spain|finland|sweden|norway|denmark|belgium|austria|poland|romania|czech|portugal|greece|hungary|ireland|russia|turkey)/i,
  AM: /(美国|美國|纽约|洛杉矶|旧金山|芝加哥|休斯顿|迈阿密|西雅图|波士顿|华盛顿|拉斯维加斯|圣何塞|圣地亚哥|加拿大|墨西哥|巴西|阿根廷|智利|🇺🇸|🇨🇦|🇲🇽|🇧🇷|🇦🇷|🇨🇱|(?<![A-Za-z])USA?(?![A-Za-z])|(?<![A-Za-z])CA(?![A-Za-z])|(?<![A-Za-z])MX(?![A-Za-z])|(?<![A-Za-z])BR(?![A-Za-z])|(?<![A-Za-z])AR(?![A-Za-z])|(?<![A-Za-z])CL(?![A-Za-z])|america|united\s*states|canada|mexico|brazil|argentina|chile)/i,
};
// 策略组模板（与 mihomoScript.js 的 groupBaseOption 语义一致）
// 健康检查调优：interval 300s 常驻 + timeout 2000ms 快速失败 + max-failed-times 2 快速剔除死节点
const groupBaseOption = {
  interval: 300, timeout: 5000, url: "https://www.g.cn/generate_204",
  lazy: false, "max-failed-times": 2, "empty-fallback": "DIRECT",
};
const LB_BASE = { type: "load-balance", strategy: "consistent-hashing", ...groupBaseOption, hidden: true, "exclude-type": "DIRECT" };
const UT_BASE = { type: "url-test", tolerance: 100, ...groupBaseOption, hidden: true, "exclude-type": "DIRECT" };
// fallback 兜底组（顺序故障转移）：地区节点全挂时自动切到任意活节点，避免 url-test 粘死
const FALLBACK_GROUP_NAME = "兜底自动选择";
const FALLBACK_BASE = { type: "fallback", ...groupBaseOption, hidden: true };

// 地区/大洲定义（顺序即生成顺序，动态地域组用）；地区含国旗（normalizeProxyName 用）
const REGION_ORDER = [
  ["香港", "🇭🇰", RE.HK, ICON.HK], ["台湾", "🇹🇼", RE.TW, ICON.TW], ["新加坡", "🇸🇬", RE.SG, ICON.SG],
  ["日本", "🇯🇵", RE.JP, ICON.JP], ["美国", "🇺🇸", RE.US, ICON.US],
];
const CONTINENT_ORDER = [
  ["亚洲", RE.AS, ICON.AS], ["欧洲", RE.EU, ICON.EU], ["美洲", RE.AM, ICON.AM],
];

// 国旗正则（emoji 地区标识）
const FLAG_RE = /[\u{1F1E6}-\u{1F1FF}]{2}/u;
// 节点分类缓存：避免地区/大洲正则对同一节点名重复执行（参考配置 regionMatchCache）
const regionMatchCache = new Map();
function classifyNode(name) {
  const cached = regionMatchCache.get(name);
  if (cached) return cached;
  const regions = [], continents = [];
  for (const [rname,, re] of REGION_ORDER) if (re.test(name)) regions.push(rname);
  for (const [cname, re] of CONTINENT_ORDER) if (re.test(name)) continents.push(cname);
  const res = { regions, continents };
  regionMatchCache.set(name, res);
  return res;
}
// 标准化节点名：保留原国旗；无国旗时按匹配地区补国旗；折叠多余空格（参考配置 normalizeProxyName）
function normalizeProxyName(proxy) {
  const name = proxy.name;
  const flag = name.match(FLAG_RE)?.[0];
  const nameWithoutFlag = (flag ? name.replace(flag, "") : name).replace(/\s+/g, " ").trim();
  const { regions } = classifyNode(name);
  const regionFlag = flag || REGION_ORDER.find(([rname]) => regions.includes(rname))?.[1];
  const normalized = regionFlag ? `${regionFlag} ${nameWithoutFlag}` : nameWithoutFlag;
  return normalized === name ? proxy : { ...proxy, name: normalized };
}

// 多版本直连节点（mihomoScript.js 设计）：国内直连 组提供 双栈/IPv4优先/IPv6优先/仅IPv4/仅IPv6
const DIRECT_PROXIES = [
  { name: "🇨🇳 直连 | 双栈", type: "direct" },
  { name: "🇨🇳 直连 | IPv4优先", type: "direct", "ip-version": "ipv4-prefer" },
  { name: "🇨🇳 直连 | IPv6优先", type: "direct", "ip-version": "ipv6-prefer" },
  { name: "🇨🇳 直连 | 仅IPv4", type: "direct", "ip-version": "ipv4" },
  { name: "🇨🇳 直连 | 仅IPv6", type: "direct", "ip-version": "ipv6" },
];

// 动态生成策略组（flclash v4.0 合并 + 开关联动）：仅生成有节点的活跃地域组；服务组按 ruleOptionsEnable 生成
function buildProxyGroups(allProxyNames, infoNames) {
  const genUt = ruleOptionsEnable["自动选择"] || ruleOptionsEnable["生成地区自动选择组"];
  const addAll = ruleOptionsEnable["分流组添加所有节点"];

  // 1. 一次遍历分类（regionMatchCache 缓存正则结果）
  const byRegion = new Map(), byContinent = new Map();
  const otherNames = [];
  for (const n of allProxyNames) {
    const { regions, continents } = classifyNode(n);
    for (const r of regions) { if (!byRegion.has(r)) byRegion.set(r, []); byRegion.get(r).push(n); }
    for (const c of continents) { if (!byContinent.has(c)) byContinent.set(c, []); byContinent.get(c).push(n); }
    if (regions.length === 0 && continents.length === 0) otherNames.push(n);
  }

  // 2. 活跃地区组（无节点不生成；LB/UT 分别受 负载均衡/自动选择 开关控制）
  const regionGroups = [];
  const lbNames = [], utNames = [], manualNames = [];
  for (const [name,, , icon] of REGION_ORDER) {
    const nodes = byRegion.get(name) || [];
    if (nodes.length === 0) continue;
    if (ruleOptionsEnable["负载均衡"]) { regionGroups.push({ name: `${name}负载均衡`, ...LB_BASE, proxies: nodes, icon }); lbNames.push(`${name}负载均衡`); }
    if (genUt) {
      // url-test 纯本地区节点：v3.1 起不再用 fallback 包装（实验证明 fallback 引用
      // url-test 组判定不可靠且会叛逃），地区全挂时连接失败（宁断不叛逃），恢复自动切回
      regionGroups.push({ name: `${name}速度优先`, ...UT_BASE, proxies: [...nodes], icon });
      utNames.push(`${name}速度优先`);
    }
  }
  // 3. 大洲手动组（受 手动选择 开关控制；隐藏地区手动选择组 控制 hidden）
  if (ruleOptionsEnable["手动选择"]) {
    const hidden = ruleOptionsEnable["隐藏地区手动选择组"];
    for (const [name, re, icon] of CONTINENT_ORDER) {
      const nodes = byContinent.get(name) || [];
      if (nodes.length === 0) continue;
      regionGroups.push({ name: `${name}手动`, type: "select", proxies: nodes, icon, ...(hidden ? { hidden: true } : {}) });
      manualNames.push(`${name}手动`);
    }
    if (otherNames.length > 0) {
      regionGroups.push({ name: "其他手动", type: "select", proxies: otherNames, icon: ICON.OT, ...(hidden ? { hidden: true } : {}) });
      manualNames.push("其他手动");
    }
  }

  // 4. 动态出站列表
  const pg = [...lbNames, ...utNames, ...manualNames];
  const op = ["一键代理", "手动选择", "国内直连", ...lbNames, ...utNames, ...manualNames, FALLBACK_GROUP_NAME]; // 兜底自动选择：手动选项垫底（v3.1）
  const ld = ["国内直连", "一键代理", "手动选择", ...lbNames];
  const ai = op.filter((n) => !n.startsWith("香港")); // AI 排除香港（flclash v4.0 合并）
  const proxyLists = { op, ld, ai, svc: addAll ? allProxyNames : op };

  // 5. 服务组（数据驱动：组+规则+规则集三联动）
  const services = [];
  const serviceRules = [];
  const serviceProviders = {};
  for (const svc of serviceConfigs) {
    if (!ruleOptionsEnable[svc.sw]) continue;
    for (const g of svc.groups) services.push({ name: g.name, type: "select", proxies: proxyLists[svc.proxiesKey], icon: g.icon });
    serviceRules.push(...svc.rules);
    Object.assign(serviceProviders, svc.providers);
  }

  // 6. 组装（核心三组始终生成；空列表兜底防止空组）
  const groups = [
    { name: "一键代理", type: "select", proxies: pg.length ? pg : ["国内直连"], icon: ICON.Rocket },
    { name: "手动选择", type: "select", proxies: manualNames.length ? manualNames : ["国内直连"], icon: ICON.Rocket },
    { name: "国内直连", type: "select", proxies: DIRECT_PROXIES.map(p=>p.name), icon: ICON.China, hidden: true },
    ...regionGroups,
    ...services,
    { name: "漏网之鱼", type: "select", proxies: op, icon: ICON.MATCH },
    // Info 组（flclash v4.0 合并）：被过滤节点保留在单独组，不丢弃
    ...(infoNames.length > 0 ? [{ name: "Info", type: "select", proxies: infoNames, icon: ICON.Available }] : []),
  ];
  // 兜底自动选择（顺序故障转移，手动选项）：被 op/漏网之鱼引用，无条件生成（v3.1）
  groups.push({ name: FALLBACK_GROUP_NAME, ...FALLBACK_BASE, proxies: allProxyNames });
  // GLOBAL 全量聚合组（参考配置主入口；BettBox 面板首位）
  const globalProxies = groups.map(g => g.name);
  groups.unshift({ name: "GLOBAL", type: "select", ...groupBaseOption, proxies: globalProxies, icon: ICON.Rocket });
  return { groups, serviceRules, serviceProviders };
}

// 规则块（与 clashmi.yml 1:1；按 ruleOptionsEnable 开关过滤，避免关闭组时悬空引用）
const RULES_PRIVATE = ["RULE-SET,private_ip,国内直连,no-resolve","RULE-SET,private_domain,国内直连","RULE-SET,ntp_domain,国内直连"];
// 国内直连加速（mihomoScript.js 参考源）：游戏/Apple/MS 国内段直连
const RULES_CN_FAST = ["RULE-SET,games_cn,国内直连","RULE-SET,epicgames,国内直连","RULE-SET,nvidia_cn,国内直连","RULE-SET,apple_cn,国内直连","RULE-SET,microsoft_cn,国内直连","DOMAIN,fsend.cn,国内直连","DOMAIN,international-gfe.download.nvidia.com,国内直连","DOMAIN-SUFFIX,hdslb.com,国内直连"];
const RULES_MY = ["RULE-SET,my_proxy,一键代理","RULE-SET,my_direct,国内直连"];
const RULES_AI = ["RULE-SET,openai_domain,ChatGPT","RULE-SET,anthropic_domain,Claude","RULE-SET,google-gemini_domain,Gemini"];
const RULES_MEDIA = ["RULE-SET,youtube_domain,流媒体","RULE-SET,netflix_domain,流媒体","RULE-SET,netflix_ip,流媒体,no-resolve",...(ruleOptionsEnable.TikTok?["RULE-SET,tiktok_domain,流媒体"]:[]),"RULE-SET,disney_domain,流媒体",...(ruleOptionsEnable.Spotify?["RULE-SET,spotify_domain,流媒体"]:[]),"RULE-SET,appletv_domain,流媒体"];
const RULES_TELEGRAM = ["RULE-SET,telegram_domain,通信","RULE-SET,telegram_ip,通信,no-resolve",...(ruleOptionsEnable.Twitter?["RULE-SET,twitter_domain,通信","RULE-SET,twitter_ip,通信,no-resolve"]:[])];
const RULES_GOOGLE = ["RULE-SET,google_domain,云服务","RULE-SET,google_ip,云服务,no-resolve","RULE-SET,speedtest_domain,云服务"];
const RULES_PAYPAL = ["RULE-SET,paypal_domain,金融"];
const RULES_APPLE = ["RULE-SET,apple_domain,Apple","RULE-SET,apple_ip,Apple,no-resolve"];
const RULES_MS = ["RULE-SET,onedrive_domain,OneDrive","RULE-SET,microsoft_domain,Microsoft"];
const RULES_CN_TAIL = ["RULE-SET,ResourceSite,国内直连","RULE-SET,PanVod,国内直连","RULE-SET,add_direct_domain,国内直连","RULE-SET,cn_domain,国内直连","RULE-SET,cn_ip,国内直连,no-resolve"];
// 屏蔽国外QUIC：国内 IP 放行，其余 UDP 443 REJECT（mihomoScript.js 规则简化版）
const RULES_QUIC = ["AND,((NETWORK,UDP),(DST-PORT,443),(NOT,((RULE-SET,cn_ip,no-resolve)))),REJECT"];

// MetaCubeX meta-rules-dat 规则集构造器（mrs 格式，gh-proxy 镜像国内可达）
const M = (file, behavior = "domain") => ({ type: "http", interval: 86400, behavior, format: "mrs", url: `https://v4.gh-proxy.org/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/${file}.mrs` });
const MI = (file) => ({ type: "http", interval: 86400, behavior: "ipcidr", format: "mrs", url: `https://v4.gh-proxy.org/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geoip/${file}.mrs` });
const MIG = (file) => ({ type: "http", interval: 86400, behavior: "ipcidr", format: "mrs", url: `https://v4.gh-proxy.org/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo-lite/geoip/${file}.mrs` });

// 服务定义（数据驱动，参考配置 serviceConfigs）：一个服务 = 组 + 规则 + 规则集 单点内聚，
// 组/规则/规则集由同一开关驱动生成，杜绝“规则引用了不存在的组/规则集”式脱节
// proxiesKey: op=一键代理聚合 / ld=直连优先 / ai=剔除香港 / svc=分流组添加所有节点时全节点
const serviceConfigs = [
  {
    sw: "AI", proxiesKey: "ai",
    groups: [{ name: "ChatGPT", icon: ICON.ChatGPT }, { name: "Claude", icon: ICON.Claude }, { name: "Gemini", icon: ICON.Gemini }],
    rules: RULES_AI,
    providers: { openai_domain: M("openai"), anthropic_domain: M("anthropic"), "google-gemini_domain": M("google-gemini") },
  },
  {
    sw: "Media", proxiesKey: "svc",
    groups: [{ name: "流媒体", icon: ICON.Netflix }],
    rules: RULES_MEDIA,
    providers: { youtube_domain: M("youtube"), netflix_domain: M("netflix"), netflix_ip: MI("netflix"), disney_domain: M("disney"), appletv_domain: M("apple-tvplus"), ...(ruleOptionsEnable.TikTok ? { tiktok_domain: M("tiktok") } : {}), ...(ruleOptionsEnable.Spotify ? { spotify_domain: M("spotify") } : {}) },
  },
  {
    sw: "Telegram", proxiesKey: "svc",
    groups: [{ name: "通信", icon: ICON.Telegram }],
    rules: RULES_TELEGRAM,
    providers: { telegram_domain: M("telegram"), telegram_ip: MI("telegram"), ...(ruleOptionsEnable.Twitter ? { twitter_domain: M("twitter"), twitter_ip: MI("twitter") } : {}) },
  },
  {
    sw: "Google", proxiesKey: "svc",
    groups: [{ name: "云服务", icon: ICON.GitHub }],
    rules: RULES_GOOGLE,
    providers: { google_domain: M("google"), google_ip: MI("google"), speedtest_domain: M("ookla-speedtest") },
  },
  {
    sw: "金融", proxiesKey: "svc",
    groups: [{ name: "金融", icon: ICON.PayPal }],
    rules: RULES_PAYPAL,
    providers: { paypal_domain: M("paypal") },
  },
  {
    sw: "Microsoft", proxiesKey: "ld",
    groups: [{ name: "Microsoft", icon: ICON.Microsoft }, { name: "OneDrive", icon: ICON.OneDrive }],
    rules: RULES_MS,
    providers: { onedrive_domain: M("onedrive"), microsoft_domain: M("microsoft") },
  },
  {
    sw: "Apple", proxiesKey: "ld",
    groups: [{ name: "Apple", icon: ICON.Apple }],
    rules: RULES_APPLE,
    providers: { apple_domain: M("apple"), apple_ip: MIG("apple") },
  },
];

// 组装规则：前置基础规则 + github 独立代理规则（必须在 microsoft 规则之前，否则被
// microsoft_domain 规则集截走——该规则集含全部 github 域名）+ 数据驱动服务规则 + 尾部兜底
function buildRules(serviceRules) {
  return [
    ...(ruleOptionsEnable.AdBlock ? ["RULE-SET,adblock,REJECT"] : []),
    ...RULES_PRIVATE,
    ...RULES_CN_FAST,
    ...RULES_MY,
    // github 走代理（mihomoScript.js 设计）：microsoft_domain 规则集 include 了 github，
    // 必须先于 RULES_MS 命中，否则 github 会被 Microsoft 组（默认国内直连）截走
    "RULE-SET,github_domain,一键代理",
    ...serviceRules,
    ...RULES_CN_TAIL,
    ...(ruleOptionsEnable["屏蔽国外QUIC"] ? RULES_QUIC : []),
    // gfw 兜底：未命中业务规则的被墙域名走代理（mihomoScript.js 设计）
    "RULE-SET,gfw,一键代理",
    "MATCH,漏网之鱼",
  ];
}
const RULE_PROVIDERS_BASE = {
  ResourceSite: { type: "http", interval: 86400, behavior: "classical", format: "text", url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/eulac-dev/Proxy/refs/heads/main/Shadowrocket/Rules/ResourceSite.list" },
  PanVod: { type: "http", interval: 86400, behavior: "classical", format: "text", url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/eulac-dev/Proxy/refs/heads/main/Shadowrocket/Rules/PanVod.list" },
  ntp_domain: M("category-ntp"),
  // 国内直连加速（mihomoScript.js 参考源）
  games_cn: M("category-games@cn"),
  epicgames: M("epicgames"),
  nvidia_cn: M("nvidia@cn"),
  apple_cn: M("apple@cn"),
  microsoft_cn: M("microsoft@cn"),
  private_domain: M("private"),
  cn_domain: M("cn"),
  cn_ip: MI("cn"),
  private_ip: MI("private"),
  "geolocation_not_cn": M("geolocation-!cn"),
  gfw: M("gfw"),
  // github 独立代理规则集（v2.9：从 Google 服务移入常驻；microsoft.mrs 含 github 域名，规则必须前置）
  github_domain: M("github"),
  // fake-ip-filter 配套规则集（mihomoScript.js 参考源 wwqgtxx/clash-rules，分支 release 用 / 不用 @）
  fakeip_filter: { type: "http", interval: 86400, behavior: "domain", format: "mrs", url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/wwqgtxx/clash-rules/release/fakeip-filter.mrs" },
  add_direct_domain: { type: "http", interval: 86400, behavior: "domain", format: "mrs", url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/Seven1echo/Yaml/refs/heads/main/rules/Seven1_Direct_Domain.mrs" },
  my_direct: { type: "http", interval: 86400, behavior: "classical", format: "text", url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/cgoder/clash_rules/main/rules/my_direct.list" },
  my_proxy: { type: "http", interval: 86400, behavior: "classical", format: "text", url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/cgoder/clash_rules/main/rules/my_proxy.list" },
  // AdBlock 规则集（仅 ruleOptionsEnable.AdBlock 开启时注入，默认不下载）
  adblock: { type: "http", interval: 86400, behavior: "domain", format: "mrs", url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/217heidai/adblockfilters/main/rules/adblockmihomolite.mrs" },
};

// ===== mihomoScript.js 的 DNS/hosts 逻辑（精简适配）=====
function buildDnsAndHosts(filteredProxies) {
  // 仅保留与 clashmi 相关的假 IP 过滤，按 mihomoScript.js 思路：节点域名需走真实 IP
  const chinaDNS = ["223.5.5.5","119.29.29.29"];
  // 默认 nameserver 用国内直连 DoH（clashmi.yml 方案）：节点/代理不可用时国内直连流量 DNS 不断；
  // 国外域名由 geolocation_not_cn policy 走代理 DoH（出口解析质量最优）
  const foreignDNS = ["https://doh.pub/dns-query","https://dns.alidns.com/dns-query"];
  const chinaDoh = ["https://223.5.5.5/dns-query#DIRECT"];
  const foreignDohViaProxy = ["https://cloudflare-dns.com/dns-query#一键代理","https://dns.google/dns-query#一键代理"];
  return {
    dns: {
      enable: true, ipv6: false, listen: "0.0.0.0:7874",
      // mihomoScript.js 参考源细节：系统 hosts 读取 + ARC 缓存 + hosts 生效开关
      "use-hosts": true, "use-system-hosts": true, "cache-algorithm": "arc",
      "enhanced-mode": "fake-ip", "fake-ip-range": "198.18.0.1/16",
      // 规则集级 fake-ip-filter（参考配置）：私有/中国大陆/常见无需 fake-ip 的域名走真实 IP
      "fake-ip-filter": ["rule-set:private_domain","rule-set:fakeip_filter","rule-set:cn_domain","+.orb.local","localhost","*.home.arpa","time.*.com","ntp.*.com","+.ntp.org","+.pool.ntp.org","captive.apple.com","connectivitycheck.gstatic.com","+.msftconnecttest.com","+.msftncsi.com","stun.*.*","+.stun.playstation.net","+.xboxlive.com","+.speedtest.net"],
      "default-nameserver": chinaDNS,
      "proxy-server-nameserver": chinaDoh,
      nameserver: foreignDNS,
      // DIRECT 流量走国内 DNS（参考配置 direct-nameserver）
      "direct-nameserver": ["system", ...chinaDNS],
      "nameserver-policy": {
        "geosite:cn": chinaDNS[0],
        // my_direct 域名走国内 DNS 直连解析（防死锁：节点/代理不可用时直连流量仍可用）
        "rule-set:my_direct": chinaDNS[0],
        "rule-set:geolocation_not_cn": foreignDohViaProxy[0],
        "rule-set:my_proxy": foreignDohViaProxy[0],
        "+.orb.local": "system",
      },
    },
    hosts: {
      // 多 IP 数组兑底（参考配置 hosts 数组写法）
      "cloudflare-dns.com": ["1.1.1.1", "1.0.0.1"],
      "dns.google": ["8.8.8.8", "8.8.4.4"],
      // 解决谷歌商店无法下载的问题
      "services.googleapis.cn": ["services.googleapis.com"],
      // 屏蔽哔哩哔哩 PCDN，解决访问视频/直播卡顿问题
      "+.mcdn.bilivideo.com": ["0.0.0.0"],
      "+.mcdn.bilivideo.cn": ["0.0.0.0"],
      "+.edge.mountaintoys.cn": ["0.0.0.0"],
      "+.h2.smtcdns.net": ["0.0.0.0"],
    }
  };
}

// ===== 节点过滤（复用 mihomoScript.js 的双重过滤 + 国旗标准化 + 去重）=====
function filterAndNormalizeProxies(allProxies) {
  regionMatchCache.clear(); // 清缓存，防上次运行残留旧名称
  // 分离噪音节点（Info 组保留，flclash v4.0 合并）与正常节点
  const info = []; const normal = [];
  for (const p of (allProxies || [])) {
    const n = typeof p === "string" ? p : p.name;
    (INVALID_PROXY_RE.test(n) || (ruleOptionsEnable["过滤非地区节点"] && excludeFilter.test(n)) ? info : normal).push(p);
  }
  // 国旗标准化（补国旗/折叠空格）+ 去重（保留首个同名，参考配置 normalizeProxyName）
  const seen = new Set(); const out = [];
  for (const p of normal) {
    const normalized = normalizeProxyName(p);
    if (!seen.has(normalized.name)) { seen.add(normalized.name); out.push(normalized); }
  }
  if (out.length === 0) throw new Error("配置文件中未找到任何代理节点，请检查订阅");
  return { filtered: out, info };
}

// ===== 主函数（BettBox 入口：必须返回 newConfig 全量对象，切勿直接改 config）=====
function main(config) {
  const log = (...args) => OPTIONS.LOG_VERBOSE && console.log(...args);
  log("🚀 clashmi_bettbox.js v3.1 基于 mihomoScript.js 重构");
  try {
    const { filtered: filteredProxies, info } = filterAndNormalizeProxies(config.proxies);
    const allProxyNames = filteredProxies.map(p => p.name);
    const infoNames = info.map(p => p.name);
    log(`📦 有效节点 ${allProxyNames.length}/${(config.proxies||[]).length}（Info ${infoNames.length}）`);

    // 1. 构建策略组（数据驱动：组+规则+规则集三联动；动态地域仅生成活跃组）并做防御性空组清理（解决 Go: use or proxies missing）
    let { groups: proxyGroups, serviceRules, serviceProviders } = buildProxyGroups(allProxyNames, infoNames);
    const empty = new Set(proxyGroups.filter(g => !g.proxies || g.proxies.length===0).map(g=>g.name));
    if (empty.size>0) {
      log(`⚠️ 剔除空地域组: ${[...empty].join("、")}`);
      proxyGroups = proxyGroups.filter(g => !empty.has(g.name));
      for (const g of proxyGroups) if (Array.isArray(g.proxies)) {
        const before=g.proxies.length; g.proxies=g.proxies.filter(p=>!empty.has(p));
        if (g.proxies.length===0) g.proxies=["DIRECT"];
        if (g.proxies.length!==before) log(`  ↳ 已清理 [${g.name}] 的空引用`);
      }
    }
    // 二次校验：仍有空则抛错便于定位
    for (const g of proxyGroups) if (!g.proxies || g.proxies.length===0) throw new Error(`策略组 ${g.name} 为空`);

    // 2. 构建 DNS/hosts（解决 Dart: _Map is not subtype of String）
    const { dns, hosts } = OPTIONS.OVERRIDE_DNS ? buildDnsAndHosts(filteredProxies) : { dns: config.dns, hosts: config.hosts };

    // 3. 全量 newConfig（参照 mihomoScript.js，不再用 CORE_CONFIG 直接覆盖）
    const newConfig = {};
    newConfig["mixed-port"] = 7893;
    newConfig["allow-lan"] = true;
    newConfig["bind-address"] = "*";
    newConfig["ipv6"] = false;
    newConfig["mode"] = "rule";
    newConfig["log-level"] = "warning";
    newConfig["unified-delay"] = true;
    newConfig["tcp-concurrent"] = true;
    newConfig["keep-alive-interval"] = 60;
    newConfig["find-process-mode"] = "strict";
    newConfig["external-controller"] = "127.0.0.1:9090";
    newConfig["external-ui"] = "ui";
    newConfig["external-ui-url"] = "https://v4.gh-proxy.org/https://github.com/Zephyruso/zashboard/releases/latest/download/dist.zip";
    newConfig["profile"] = { "store-selected": OPTIONS.STORE_SELECTED, "store-fake-ip": true };
    if (OPTIONS.OVERRIDE_TUN) newConfig["tun"] = { enable: true, stack: "system", mtu: 1300, "auto-route": true, "strict-route": true, "auto-redirect": true, "auto-detect-interface": true, "endpoint-independent-nat": true, "route-exclude-cidr": ["192.168.0.0/16","10.0.0.0/8","172.16.0.0/12","100.64.0.0/10","169.254.0.0/16","fc00::/7","fe80::/10"], "loopback-address": ["10.7.0.1"], "dns-hijack": ["any:53","tcp://any:53"] };
    // sniffer（clashmi.yml 全量）：override-destination + force/skip-domain；结构已按 mihomo 标准 schema，规避此前的 _Map 类型问题
    if (OPTIONS.OVERRIDE_SNIFFER) newConfig["sniffer"] = { enable: true, "override-destination": true, "parse-pure-ip": true, "force-dns-mapping": true, sniff: { QUIC: { ports: [443, 8443] }, TLS: { ports: [443, 8443] }, HTTP: { ports: [80, "8080-8880"], "override-destination": true } }, "force-domain": ["+.netflix.com","+.nflxvideo.net","+.googlevideo.com","+.youtube.com","+.telegram.org","+.t.me","+.twitter.com","+.twimg.com","+.tiktok.com","+.amazonaws.com"], "skip-domain": ["+.apple.com","Mijia Cloud","dlg.io.mi.com","+.oray.com","+.sunlogin.net"] };
    // info 节点保留在 proxies（Info 组引用），但不进任何常规代理路径
    newConfig["proxies"] = [...DIRECT_PROXIES, ...info, ...filteredProxies];
    newConfig["proxy-groups"] = proxyGroups;
    const providers = { ...RULE_PROVIDERS_BASE, ...serviceProviders };
    if (!ruleOptionsEnable.AdBlock) delete providers.adblock; // 默认关闭时不下发 adblock 规则集
    newConfig["rule-providers"] = OPTIONS.OVERRIDE_RULES ? providers : { ...(config["rule-providers"]||{}), ...providers };
    newConfig["rules"] = OPTIONS.OVERRIDE_RULES ? buildRules(serviceRules) : [...buildRules(serviceRules), ...(config.rules||[])];
    newConfig["dns"] = dns;
    newConfig["hosts"] = hosts;
    newConfig["ntp"] = { enable: true, "write-to-system": false, server: "ntp.aliyun.com", port: 123, interval: 60 };

    log(`✅ 生成: ${newConfig.proxies.length} 节点 | ${newConfig["proxy-groups"].length} 组 | ${newConfig.rules.length} 规则`);
    return newConfig;
  } catch (e) {
    console.log(`❌ 脚本错误: ${e.message}\n${e.stack}`);
    throw e;
  }
}
