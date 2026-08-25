// ============================================================
// 🔧 clashmi.yml → BettBox JS Override  v2.4  (基于 mihomoScript.js 重构)
// ⏰ 更新时间: 2026-08-25 12:40:00 CST
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

// 适配 BettBox 自定义配置参数（保持与 mihomoScript.js 一致）
const Compatible_With_Bettbox = { ruleOptionsEnable: true };

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

const ruleOptionsEnable = {
  手动选择: true,
  自动选择: true,
  负载均衡: true,
  AI: true,
  Media: true,
  FCM: false,
  Google: true,
  Microsoft: true,
  Apple: true,
  Telegram: true,
  Steam: false,
  TikTok: true,
  Twitter: true,
  Emby: false,
  PikPak: false,
  Spotify: true,
  Crypto: false,
  EHentai: false,
  AdBlock: false,
  生成地区自动选择组: true,
  隐藏地区手动选择组: false,
  生成倍率组: false,
  分流组添加所有节点: false,
  过滤高倍率节点: false,
  过滤非地区节点: true,
  屏蔽国外QUIC: false,
  代理IPV4优先: false,
  代理IPV6优先: false,
  链式代理: false,
};

// 图标
const ICON_BASE = "https://v4.gh-proxy.org/https://github.com/cgoder/clash_rules/raw/main/icons";
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
const ALL_REGION_KEYWORDS_RE = new RegExp([RE.AS.source, RE.EU.source, RE.AM.source].join("|"), "i");
function isOtherRegion(name) { return !ALL_REGION_KEYWORDS_RE.test(name); }

// 策略组模板（与 mihomoScript.js 的 groupBaseOption 语义一致）
// 健康检查调优：interval 300s 常驻 + timeout 2000ms 快速失败 + max-failed-times 2 快速剔除死节点
const groupBaseOption = {
  interval: 300, timeout: 2000, url: "https://www.g.cn/generate_204",
  lazy: false, "max-failed-times": 2, "empty-fallback": "DIRECT",
};
const LB_BASE = { type: "load-balance", strategy: "consistent-hashing", ...groupBaseOption, hidden: true };
const UT_BASE = { type: "url-test", tolerance: 100, ...groupBaseOption, hidden: true };
// fallback 兜底组（顺序故障转移）：地区节点全挂时自动切到任意活节点，避免 url-test 粘死
const FALLBACK_GROUP_NAME = "兜底自动选择";
const FALLBACK_BASE = { type: "fallback", ...groupBaseOption, hidden: true };

// 地区/大洲定义（顺序即生成顺序，动态地域组用）
const REGION_ORDER = [
  ["香港", RE.HK, ICON.HK], ["台湾", RE.TW, ICON.TW], ["新加坡", RE.SG, ICON.SG],
  ["日本", RE.JP, ICON.JP], ["美国", RE.US, ICON.US],
];
const CONTINENT_ORDER = [
  ["亚洲", RE.AS, ICON.AS], ["欧洲", RE.EU, ICON.EU], ["美洲", RE.AM, ICON.AM],
];

// 多版本直连节点（mihomoScript.js 设计）：国内直连 组提供 双栈/IPv4优先/IPv6优先/仅IPv4/仅IPv6
const DIRECT_PROXIES = [
  { name: "🇨🇳 直连 | 双栈", type: "direct" },
  { name: "🇨🇳 直连 | IPv4优先", type: "direct", "ip-version": "ipv4-prefer" },
  { name: "🇨🇳 直连 | IPv6优先", type: "direct", "ip-version": "ipv6-prefer" },
  { name: "🇨🇳 直连 | 仅IPv4", type: "direct", "ip-version": "ipv4" },
  { name: "🇨🇳 直连 | 仅IPv6", type: "direct", "ip-version": "ipv6" },
];

// 动态生成策略组（flclash v4.0 合并）：仅生成有节点的活跃地域组；服务组引用动态出站列表
function buildProxyGroups(allProxyNames, infoNames) {
  const filterBy = (re) => allProxyNames.filter((n) => re.test(n));

  // 1. 活跃地区/大洲组（无节点则不生成）
  const regionGroups = [];
  const lbNames = [], utNames = [], manualNames = [];
  for (const [name, re, icon] of REGION_ORDER) {
    const nodes = filterBy(re);
    if (nodes.length === 0) continue;
    regionGroups.push({ name: `${name}负载均衡`, ...LB_BASE, proxies: nodes, icon });
    regionGroups.push({ name: `${name}速度优先`, ...UT_BASE, proxies: [...nodes, FALLBACK_GROUP_NAME], icon });
    lbNames.push(`${name}负载均衡`); utNames.push(`${name}速度优先`);
  }
  for (const [name, re, icon] of CONTINENT_ORDER) {
    const nodes = filterBy(re);
    if (nodes.length === 0) continue;
    regionGroups.push({ name: `${name}手动`, type: "select", proxies: nodes, icon });
    manualNames.push(`${name}手动`);
  }
  const otherNodes = allProxyNames.filter((n) => isOtherRegion(n));
  if (otherNodes.length > 0) {
    regionGroups.push({ name: "其他手动", type: "select", proxies: otherNodes, icon: ICON.OT });
    manualNames.push("其他手动");
  }

  // 2. 动态出站列表（对齐原 PROXIES_PG/OP/LD 语义）
  const pg = [...lbNames, ...utNames, ...manualNames];
  const op = ["一键代理", "手动选择", "国内直连", ...lbNames, ...utNames, ...manualNames];
  const ld = ["国内直连", "一键代理", "手动选择", ...lbNames];
  // AI 排除香港（flclash v4.0 合并）：避免 AI 服务默认落香港节点
  const ai = op.filter((n) => !n.startsWith("香港"));

  return [
    { name: "一键代理", type: "select", proxies: pg, icon: ICON.Rocket },
    { name: "手动选择", type: "select", proxies: manualNames, icon: ICON.Rocket },
    { name: "国内直连", type: "select", proxies: DIRECT_PROXIES.map(p=>p.name), icon: ICON.China, hidden: true },
    ...regionGroups,
    { name: "ChatGPT", type: "select", proxies: ai, icon: ICON.ChatGPT },
    { name: "Claude", type: "select", proxies: ai, icon: ICON.Claude },
    { name: "Gemini", type: "select", proxies: ai, icon: ICON.Gemini },
    { name: "流媒体", type: "select", proxies: op, icon: ICON.Netflix },
    { name: "通信", type: "select", proxies: op, icon: ICON.Telegram },
    { name: "云服务", type: "select", proxies: op, icon: ICON.GitHub },
    { name: "金融", type: "select", proxies: op, icon: ICON.PayPal },
    { name: "Microsoft", type: "select", proxies: ld, icon: ICON.Microsoft },
    { name: "OneDrive", type: "select", proxies: ld, icon: ICON.OneDrive },
    { name: "Apple", type: "select", proxies: ld, icon: ICON.Apple },
    { name: "漏网之鱼", type: "select", proxies: op, icon: ICON.MATCH },
    // Info 组（flclash v4.0 合并）：被过滤节点保留在单独组，不丢弃
    ...(infoNames.length > 0 ? [{ name: "Info", type: "select", proxies: infoNames, icon: ICON.Available }] : []),
    // 兜底自动选择（顺序故障转移）：作为各"XX速度优先"组最后一个成员，地区全挂时自动切到任意活节点
    { name: FALLBACK_GROUP_NAME, ...FALLBACK_BASE, proxies: allProxyNames },
  ];
}

// 规则（与 clashmi.yml 1:1）
const RULES_BASE = [
  "RULE-SET,private_ip,国内直连,no-resolve","RULE-SET,private_domain,国内直连","RULE-SET,ntp_domain,国内直连",
  // 国内直连加速（mihomoScript.js 参考源）：游戏/Apple/MS 国内段直连
  "RULE-SET,games_cn,国内直连","RULE-SET,epicgames,国内直连","RULE-SET,nvidia_cn,国内直连","RULE-SET,apple_cn,国内直连","RULE-SET,microsoft_cn,国内直连",
  "DOMAIN,fsend.cn,国内直连","DOMAIN,international-gfe.download.nvidia.com,国内直连","DOMAIN-SUFFIX,hdslb.com,国内直连",
  "RULE-SET,my_proxy,一键代理","RULE-SET,my_direct,国内直连",
  "RULE-SET,openai_domain,ChatGPT","RULE-SET,anthropic_domain,Claude","RULE-SET,google-gemini_domain,Gemini",
  "RULE-SET,youtube_domain,流媒体","RULE-SET,netflix_domain,流媒体","RULE-SET,netflix_ip,流媒体,no-resolve","RULE-SET,tiktok_domain,流媒体","RULE-SET,disney_domain,流媒体","RULE-SET,spotify_domain,流媒体","RULE-SET,appletv_domain,流媒体",
  "RULE-SET,telegram_domain,通信","RULE-SET,telegram_ip,通信,no-resolve","RULE-SET,twitter_domain,通信","RULE-SET,twitter_ip,通信,no-resolve",
  "RULE-SET,google_domain,云服务","RULE-SET,google_ip,云服务,no-resolve","RULE-SET,github_domain,云服务","RULE-SET,speedtest_domain,云服务",
  "RULE-SET,paypal_domain,金融",
  "RULE-SET,apple_domain,Apple","RULE-SET,apple_ip,Apple,no-resolve",
  "RULE-SET,onedrive_domain,OneDrive","RULE-SET,microsoft_domain,Microsoft",
  "RULE-SET,ResourceSite,国内直连","RULE-SET,PanVod,国内直连","RULE-SET,add_direct_domain,国内直连","RULE-SET,cn_domain,国内直连","RULE-SET,cn_ip,国内直连,no-resolve",
  // gfw 兜底：未命中业务规则的被墙域名走代理（mihomoScript.js 设计）
  "RULE-SET,gfw,一键代理",
  "MATCH,漏网之鱼",
];

// 组装规则：AdBlock 置顶，避免广告域名被业务分流抢先匹配（ruleOptionsEnable.AdBlock 默认关）
function buildRules() {
  return [
    ...(ruleOptionsEnable.AdBlock ? ["RULE-SET,adblock,REJECT"] : []),
    ...RULES_BASE,
  ];
}
const RULE_PROVIDERS = {
  ResourceSite: { type: "http", interval: 86400, behavior: "classical", format: "text", url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/eulac-dev/Proxy/refs/heads/main/Shadowrocket/Rules/ResourceSite.list" },
  PanVod: { type: "http", interval: 86400, behavior: "classical", format: "text", url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/eulac-dev/Proxy/refs/heads/main/Shadowrocket/Rules/PanVod.list" },
  ntp_domain: { type: "http", interval: 86400, behavior: "domain", format: "mrs", url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/category-ntp.mrs" },
  // 国内直连加速（mihomoScript.js 参考源）
  games_cn: { type: "http", interval: 86400, behavior: "domain", format: "mrs", url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/category-games@cn.mrs" },
  epicgames: { type: "http", interval: 86400, behavior: "domain", format: "mrs", url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/epicgames.mrs" },
  nvidia_cn: { type: "http", interval: 86400, behavior: "domain", format: "mrs", url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/nvidia@cn.mrs" },
  apple_cn: { type: "http", interval: 86400, behavior: "domain", format: "mrs", url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/apple@cn.mrs" },
  microsoft_cn: { type: "http", interval: 86400, behavior: "domain", format: "mrs", url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/microsoft@cn.mrs" },
  private_domain: { type: "http", interval: 86400, behavior: "domain", format: "mrs", url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/private.mrs" },
  speedtest_domain: { type: "http", interval: 86400, behavior: "domain", format: "mrs", url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/ookla-speedtest.mrs" },
  openai_domain: { type: "http", interval: 86400, behavior: "domain", format: "mrs", url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/openai.mrs" },
  anthropic_domain: { type: "http", interval: 86400, behavior: "domain", format: "mrs", url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/anthropic.mrs" },
  "google-gemini_domain": { type: "http", interval: 86400, behavior: "domain", format: "mrs", url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/google-gemini.mrs" },
  github_domain: { type: "http", interval: 86400, behavior: "domain", format: "mrs", url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/github.mrs" },
  youtube_domain: { type: "http", interval: 86400, behavior: "domain", format: "mrs", url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/youtube.mrs" },
  google_domain: { type: "http", interval: 86400, behavior: "domain", format: "mrs", url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/google.mrs" },
  onedrive_domain: { type: "http", interval: 86400, behavior: "domain", format: "mrs", url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/onedrive.mrs" },
  microsoft_domain: { type: "http", interval: 86400, behavior: "domain", format: "mrs", url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/microsoft.mrs" },
  appletv_domain: { type: "http", interval: 86400, behavior: "domain", format: "mrs", url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/apple-tvplus.mrs" },
  apple_domain: { type: "http", interval: 86400, behavior: "domain", format: "mrs", url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/apple.mrs" },
  tiktok_domain: { type: "http", interval: 86400, behavior: "domain", format: "mrs", url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/tiktok.mrs" },
  twitter_domain: { type: "http", interval: 86400, behavior: "domain", format: "mrs", url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/twitter.mrs" },
  telegram_domain: { type: "http", interval: 86400, behavior: "domain", format: "mrs", url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/telegram.mrs" },
  netflix_domain: { type: "http", interval: 86400, behavior: "domain", format: "mrs", url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/netflix.mrs" },
  disney_domain: { type: "http", interval: 86400, behavior: "domain", format: "mrs", url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/disney.mrs" },
  spotify_domain: { type: "http", interval: 86400, behavior: "domain", format: "mrs", url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/spotify.mrs" },
  paypal_domain: { type: "http", interval: 86400, behavior: "domain", format: "mrs", url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/paypal.mrs" },
  "geolocation_not_cn": { type: "http", interval: 86400, behavior: "domain", format: "mrs", url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/geolocation-!cn.mrs" },
  gfw: { type: "http", interval: 86400, behavior: "domain", format: "mrs", url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/gfw.mrs" },
  // AdBlock 规则集（仅 ruleOptionsEnable.AdBlock 开启时注入，默认不下载）
  adblock: { type: "http", interval: 86400, behavior: "domain", format: "mrs", url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/217heidai/adblockfilters/main/rules/adblockmihomolite.mrs" },
  cn_domain: { type: "http", interval: 86400, behavior: "domain", format: "mrs", url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/cn.mrs" },
  add_direct_domain: { type: "http", interval: 86400, behavior: "domain", format: "mrs", url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/Seven1echo/Yaml/refs/heads/main/rules/Seven1_Direct_Domain.mrs" },
  my_direct: { type: "http", interval: 86400, behavior: "classical", format: "text", url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/cgoder/clash_rules/main/rules/my_direct.list" },
  my_proxy: { type: "http", interval: 86400, behavior: "classical", format: "text", url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/cgoder/clash_rules/main/rules/my_proxy.list" },
  apple_ip: { type: "http", interval: 86400, behavior: "ipcidr", format: "mrs", url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo-lite/geoip/apple.mrs" },
  private_ip: { type: "http", interval: 86400, behavior: "ipcidr", format: "mrs", url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geoip/private.mrs" },
  google_ip: { type: "http", interval: 86400, behavior: "ipcidr", format: "mrs", url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geoip/google.mrs" },
  telegram_ip: { type: "http", interval: 86400, behavior: "ipcidr", format: "mrs", url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geoip/telegram.mrs" },
  twitter_ip: { type: "http", interval: 86400, behavior: "ipcidr", format: "mrs", url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geoip/twitter.mrs" },
  netflix_ip: { type: "http", interval: 86400, behavior: "ipcidr", format: "mrs", url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geoip/netflix.mrs" },
  cn_ip: { type: "http", interval: 86400, behavior: "ipcidr", format: "mrs", url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geoip/cn.mrs" },
};

// ===== mihomoScript.js 的 DNS/hosts 逻辑（精简适配）=====
function buildDnsAndHosts(filteredProxies) {
  // 仅保留与 clashmi 相关的假 IP 过滤，按 mihomoScript.js 思路：节点域名需走真实 IP
  const chinaDNS = ["223.5.5.5","119.29.29.29"];
  const foreignDNS = ["https://doh.pub/dns-query","https://dns.alidns.com/dns-query"];
  // 对齐 mihomoScript.js：国外走 cloudflare/google 经代理，国内走直连；
  // 之前用 https://1.1.1.1 直连在部分网络下 context deadline exceeded，参考可用的 mihomoScript.js 改为域名 DoH
  const chinaDoh = ["https://223.5.5.5/dns-query#DIRECT"];
  const foreignDohViaProxy = ["https://cloudflare-dns.com/dns-query#一键代理","https://dns.google/dns-query#一键代理"];
  return {
    dns: {
      enable: true, ipv6: false, listen: "0.0.0.0:7874",
      "enhanced-mode": "fake-ip", "fake-ip-range": "198.18.0.1/16",
      "fake-ip-filter": ["+.orb.local","localhost","*.home.arpa","time.*.com","ntp.*.com","+.ntp.org","+.pool.ntp.org","captive.apple.com","connectivitycheck.gstatic.com","+.msftconnecttest.com","+.msftncsi.com","stun.*.*","+.stun.playstation.net","+.xboxlive.com","+.speedtest.net"],
      "default-nameserver": chinaDNS,
      "proxy-server-nameserver": chinaDoh,
      nameserver: foreignDohViaProxy,
      "nameserver-policy": {
        "geosite:cn": chinaDNS[0],
        "rule-set:geolocation_not_cn": foreignDohViaProxy[0],
        "rule-set:my_proxy": foreignDohViaProxy[0],
        "+.orb.local": "system",
      },
    },
    hosts: {
      "cloudflare-dns.com": "1.1.1.1",
      "dns.google": "8.8.8.8",
      // 解决谷歌商店无法下载的问题
      "services.googleapis.cn": "services.googleapis.com",
      // 屏蔽哔哩哔哩 PCDN，解决访问视频/直播卡顿问题
      "+.mcdn.bilivideo.com": "0.0.0.0",
      "+.mcdn.bilivideo.cn": "0.0.0.0",
      "+.edge.mountaintoys.cn": "0.0.0.0",
      "+.h2.smtcdns.net": "0.0.0.0",
    }
  };
}

// ===== 节点过滤（复用 mihomoScript.js 的双重过滤 + 去重）=====
function filterAndNormalizeProxies(allProxies) {
  // 分离噪音节点（Info 组保留，flclash v4.0 合并）与正常节点
  const info = []; const normal = [];
  for (const p of (allProxies || [])) {
    const n = typeof p === "string" ? p : p.name;
    (INVALID_PROXY_RE.test(n) || excludeFilter.test(n) ? info : normal).push(p);
  }
  // 去重（保留首个同名）
  const seen = new Set(); const out = [];
  for (const p of normal) {
    if (!seen.has(p.name)) { seen.add(p.name); out.push(p); }
  }
  if (out.length === 0) throw new Error("配置文件中未找到任何代理节点，请检查订阅");
  return { filtered: out, info };
}

// ===== 主函数（BettBox 入口：必须返回 newConfig 全量对象，切勿直接改 config）=====
function main(config) {
  const log = (...args) => OPTIONS.LOG_VERBOSE && console.log(...args);
  log("🚀 clashmi_bettbox.js v2.3 基于 mihomoScript.js 重构");
  try {
    const { filtered: filteredProxies, info } = filterAndNormalizeProxies(config.proxies);
    const allProxyNames = filteredProxies.map(p => p.name);
    const infoNames = info.map(p => p.name);
    log(`📦 有效节点 ${allProxyNames.length}/${(config.proxies||[]).length}（Info ${infoNames.length}）`);

    // 1. 构建策略组（动态地域：仅生成活跃组）并做防御性空组清理（解决 Go: use or proxies missing）
    let proxyGroups = buildProxyGroups(allProxyNames, infoNames);
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
    const providers = { ...RULE_PROVIDERS };
    if (!ruleOptionsEnable.AdBlock) delete providers.adblock; // 默认关闭时不下发 adblock 规则集
    newConfig["rule-providers"] = OPTIONS.OVERRIDE_RULES ? providers : { ...(config["rule-providers"]||{}), ...providers };
    newConfig["rules"] = OPTIONS.OVERRIDE_RULES ? buildRules() : [...buildRules(), ...(config.rules||[])];
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
