// 适配 BettBox 自定义配置参数（保持与 mihomoScript.js 一致）
// ⚠️ 必须位于文件前 2000 字符内：BettBox 仅检查 head.substring(0,2000) 是否含
//    'Compatible_With_Bettbox'（lib/models/common.dart isCompatibleWithBettbox），
//    否则策略组面板不显示 ruleOptionsEnable 开关菜单
const Compatible_With_Bettbox = { ruleOptionsEnable: true };

// ============================================================
// 🔧 clashmi_lite.js v1.2 — 简版覆写脚本
// 设计：Script.js（AIsouler/MyClash 精简版）骨架 × clashmi.yml 优势融合
// 参考：https://raw.githubusercontent.com/AIsouler/MyClash/main/Script/Script.js
// ⏰ 更新时间: 2026-08-25 15:10:00 CST
//
// v1.2 变更（修复 DNS 全断：代理不可用时连国内直连流量都无法解析）：
// - 根因：nameserver 全部指向代理 DoH（cloudflare-dns.com#默认代理），节点链路
//   不可用时 DNS 全部 EOF（日志: all DNS requests failed ... EOF），连 my_direct
//   直连域名（如 v4.gh-proxy.org）也解析不了 → 全断
// - 修复：默认 nameserver 改用国内直连 DoH（doh.pub/dns.alidns.com，clashmi.yml
//   方案），国外域名仍由 geolocation_not_cn policy 走代理 DoH（质量不变）；
//   nameserver-policy 增加 rule-set:my_direct → 223.5.5.5（直连域名国内解析防死锁）
//
// v1.1 变更（修复 loop detected in ProxyGroup）：
// - 根因：订阅里存在与策略组同名的节点（如节点叫"台湾"），mihomo 解析时
//   组名覆盖节点名 → 该节点在组 proxies 中被当作组引用 → 自环报错
// - 修复：节点名与组名冲突时重命名（匹配地区的加国旗"台湾"→"🇹🇼 台湾"，
//   其余加"节点"后缀），所有组引用同步指向重命名后的名字
//
// v1.0：Script.js 骨架 × clashmi.yml 优势融合（结构详见下）
//
// 结构（最小需求）：
//   地区组：香港/日本/台湾/新加坡/美国 —— 手动 select + 隐藏 url-test 双模式，
//           默认选中"XX-自动选择"（速度优先），可展开手动指定节点
//   场景组：AI（GPT/Claude/Gemini，默认美国）、Google（默认美国）、
//           OneDrive（默认"默认代理"，国内段规则直连）、Microsoft/Apple（默认国内直连）
//   默认代理：聚合入口（5 地区 + 其他节点 + 兜底），未细分的特殊服务都走它
//   漏网之鱼：默认代理/手动选择/国内直连/兜底
// 保留 clashmi.yml 优势：
//   - my_proxy/my_direct 自定义本地规则
//   - ResourceSite/PanVod/add_direct_domain 国内直连加速
//   - games_cn/epicgames/nvidia_cn/apple_cn/microsoft_cn + fsend.cn 等直连
//   - 多版本直连（双栈/IPv4优先/IPv6优先/仅IPv4/仅IPv6）
//   - TUN/sniffer/DNS/hosts 细节（mtu 1300、EIM、force-domain、PCDN 屏蔽）
//   - gh-proxy 图标与规则源（国内可达）
// 保留 v2.2 优势：健康检查调优（interval 300 常驻/timeout 2000/max-failed-times 2）
//   + 兜底自动选择 fallback 顺序故障转移（地区节点全挂自动切活节点）
// 删除：大洲组、流媒体/通信/云服务/金融组、倍率组、链式代理、Info 组
// ============================================================

// 运行时开关（BettBox 面板不显示；改文件默认值即可）
const OPTIONS = {
  OVERRIDE_GROUPS: true,
  OVERRIDE_RULES: true,
  OVERRIDE_DNS: true,
  OVERRIDE_TUN: true,
  OVERRIDE_SNIFFER: true,
  LOG_VERBOSE: true,
  // false 避免记住死节点（BettBox 推荐）
  STORE_SELECTED: false,
};

// 用户可调开关（BettBox 面板勾选；真正驱动 组+规则+规则集 生成）
const ruleOptionsEnable = {
  // === 地区组结构 ===
  手动选择: true,           // "手动选择"聚合组（引用各地区组）；false 时退化为国内直连
  生成地区自动选择组: true, // 各地区生成隐藏 url-test 子组（"XX-自动选择"），地区组默认选中它
  隐藏地区手动选择组: false, // true 时地区 select 组 hidden（仅保留自动选择）
  分流组添加所有节点: false, // true 时场景组直接引用全部节点而非组引用
  // === 节点过滤 ===
  过滤非地区节点: true,      // 无地区标识且命中噪音词的节点被过滤（匹配地区的节点永不丢）
  屏蔽国外QUIC: false,      // 屏蔽国外 QUIC（UDP 443 非国内 REJECT）
  // === 场景组（联动 组+规则+规则集）===
  AI: true,                 // GPT/Claude/Gemini，默认美国
  Google: true,             // 谷歌系（部分服务需美国 IP），默认美国
  OneDrive: true,           // 特例：国内段规则直连，国外段走组（默认"默认代理"）
  Microsoft: true,          // 默认国内直连（LD 直连优先）
  Apple: true,              // 默认国内直连（LD 直连优先）
  // === 功能开关 ===
  AdBlock: false,           // 广告拦截（adblock 规则集 + REJECT 置顶）
};

// 图标（gh-proxy + raw 直链，国内可达）
// 注意：勿用 github.com/.../raw/... 路径——gh-proxy 需跟随 302 跳转才能到
// raw.githubusercontent.com，部分实现跟随失败导致图标 404；raw 直链无跳转更可靠
const ICON_BASE = "https://v4.gh-proxy.org/https://raw.githubusercontent.com/cgoder/clash_rules/main/icons";
const ICON = {
  Proxy: `${ICON_BASE}/Rocket.png`,
  Manual: `${ICON_BASE}/Rocket.png`,
  China: `${ICON_BASE}/China.png`,
  HK: `${ICON_BASE}/HK.png`,
  TW: `${ICON_BASE}/TW.png`,
  SG: `${ICON_BASE}/SG.png`,
  JP: `${ICON_BASE}/JP.png`,
  US: `${ICON_BASE}/US.png`,
  Other: `${ICON_BASE}/OT.png`,
  AI: `${ICON_BASE}/ChatGPT.png`,
  Google: `${ICON_BASE}/Google.png`,
  OneDrive: `${ICON_BASE}/OneDrive.png`,
  Microsoft: `${ICON_BASE}/Microsoft.png`,
  Apple: `${ICON_BASE}/Apple.png`,
  MATCH: `${ICON_BASE}/MATCH.png`,
};

// 硬噪音节点（等价 clashmi Anchor_PR filter：机场信息/到期节点，必丢）
const INVALID_PROXY_RE = /剩余流量|距离下次重置|套餐到期|去除.*线路|跳转域名|请勿连接/;
// 噪音关键词（Script.js excludeFilter）：仅对"无地区标识"的节点生效
const excludeFilter = /群|返利|循环|官网|客服|网站|网址|获取|订阅|流量|到期|机场|下次|版本|官址|备用|过期|已用|联系|邮箱|工单|贩卖|通知|倒卖|防止|国内|地址|频道|电报|无法|说明|使用|提示|访问|支持|教程|关注|更新|作者|加入|超时|收藏|优惠|福利|邀请|好友|失联|选择|剩余|公益|发布|DIZTNA|通路|登录|禁止|定时|渠道|牢记|永久|余额|阁下|本站|刷新|导航|建议|重置|以下|⚠️|@|t\.me\/\+|\bexpire\b|\bhttps?:\/\/|\.com|\btraffic\b/iu;

// 地区正则（mihomoScript.js 环视写法：兼容 HK01/东京JP 紧贴写法；\b 对数字/汉字邻接失效）
const RE = {
  HK: /(香港|🇭🇰|(?<![A-Za-z])HKG?(?![A-Za-z])|hong\s*kong)/i,
  TW: /(台湾|台灣|台北|高雄|🇹🇼|(?<![A-Za-z])TWN?(?![A-Za-z])|taiwan)/i,
  SG: /(新加坡|狮城|🇸🇬|(?<![A-Za-z])SGP?(?![A-Za-z])|singapore)/i,
  JP: /(日本|东京|大阪|京都|🇯🇵|(?<![A-Za-z])JPN?(?![A-Za-z])|japan)/i,
  US: /(美国|美國|纽约|洛杉矶|旧金山|芝加哥|休斯顿|迈阿密|西雅图|波士顿|华盛顿|拉斯维加斯|圣何塞|圣地亚哥|🇺🇸|(?<![A-Za-z])USA?(?![A-Za-z])|america|united\s*states)/i,
};
// 五地区并集：判断节点是否属于常见地区（不属于 → 其他节点 / 可能被噪音过滤）
const REGION_ALL = new RegExp([RE.HK.source, RE.TW.source, RE.SG.source, RE.JP.source, RE.US.source].join("|"), "i");

// 策略组名集合：节点名不得与任何组名相同，否则 mihomo 解析时组名覆盖节点名，
// 该节点在组 proxies 里被当作组引用 → 自环 → "loop is detected in ProxyGroup"
// （真实案例：订阅里有节点叫"台湾"，与地区组同名触发）
const GROUP_NAMES = new Set([
  "默认代理", "手动选择", "国内直连",
  "香港", "日本", "台湾", "新加坡", "美国", "其他节点",
  "香港-自动选择", "日本-自动选择", "台湾-自动选择", "新加坡-自动选择", "美国-自动选择",
  "AI", "Google", "OneDrive", "Microsoft", "Apple", "漏网之鱼", "兜底自动选择",
]);
// 冲突节点重命名：匹配地区的加国旗（"台湾" → "🇹🇼 台湾"），其余加"节点"后缀
const FLAG_BY_RE = [[RE.HK, "🇭🇰"], [RE.TW, "🇹🇼"], [RE.SG, "🇸🇬"], [RE.JP, "🇯🇵"], [RE.US, "🇺🇸"]];
function renameIfGroupNameCollision(name) {
  if (!GROUP_NAMES.has(name)) return name;
  for (const [re, flag] of FLAG_BY_RE) if (re.test(name)) return `${flag} ${name}`;
  return `${name}节点`;
}

// 策略组公共配置（v2.2 健康检查调优：常驻检测 + 快速失败 + 快速剔除死节点）
const groupBaseOption = {
  interval: 300, timeout: 2000, url: "https://www.g.cn/generate_204",
  lazy: false, "max-failed-times": 2, "empty-fallback": "DIRECT",
};
const UT_BASE = { type: "url-test", tolerance: 100, ...groupBaseOption, hidden: true };
// fallback 兜底组（顺序故障转移）：地区节点全挂时自动切到任意活节点，避免 url-test 粘死
const FALLBACK_GROUP_NAME = "兜底自动选择";
const FALLBACK_BASE = { type: "fallback", ...groupBaseOption, hidden: true };

// 地区定义（顺序即面板顺序）
const REGION_ORDER = [
  ["香港", RE.HK, ICON.HK], ["日本", RE.JP, ICON.JP],
  ["台湾", RE.TW, ICON.TW], ["新加坡", RE.SG, ICON.SG], ["美国", RE.US, ICON.US],
];

// 多版本直连节点（mihomoScript.js 设计）：国内直连 组提供 双栈/IPv4优先/IPv6优先/仅IPv4/仅IPv6
const DIRECT_PROXIES = [
  { name: "🇨🇳 直连 | 双栈", type: "direct" },
  { name: "🇨🇳 直连 | IPv4优先", type: "direct", "ip-version": "ipv4-prefer" },
  { name: "🇨🇳 直连 | IPv6优先", type: "direct", "ip-version": "ipv6-prefer" },
  { name: "🇨🇳 直连 | 仅IPv4", type: "direct", "ip-version": "ipv4" },
  { name: "🇨🇳 直连 | 仅IPv6", type: "direct", "ip-version": "ipv6" },
];

// 动态生成策略组：仅生成有节点的活跃地区组；场景组按 ruleOptionsEnable 生成
function buildProxyGroups(allProxyNames) {
  const filterBy = (re) => allProxyNames.filter((n) => re.test(n));
  const genAuto = ruleOptionsEnable["生成地区自动选择组"];
  const hideManual = ruleOptionsEnable["隐藏地区手动选择组"];
  const addAllNodes = ruleOptionsEnable["分流组添加所有节点"];

  // 1. 地区组（select 手动 + 隐藏 url-test 自动子组；无节点不生成）
  const groups = [];
  const regionNames = [];
  for (const [name, re, icon] of REGION_ORDER) {
    const nodes = filterBy(re);
    if (nodes.length === 0) continue;
    const autoName = `${name}-自动选择`;
    const selectProxies = [];
    if (genAuto) {
      // 自动子组末尾挂兜底：本地区节点全挂时顺序切到任意活节点
      groups.push({ name: autoName, ...UT_BASE, proxies: [...nodes, FALLBACK_GROUP_NAME], icon });
      selectProxies.push(autoName); // 放第一位 → 默认选中"自动选择"
    }
    selectProxies.push(...nodes);
    groups.push({ name, type: "select", ...groupBaseOption, proxies: selectProxies, icon, ...(hideManual ? { hidden: true } : {}) });
    regionNames.push(name);
  }

  // 2. 其他节点（未匹配五地区的节点，Script.js 兜底设计）
  const matched = new Set();
  for (const n of allProxyNames) if (REGION_ALL.test(n)) matched.add(n);
  const otherNodes = allProxyNames.filter((n) => !matched.has(n));
  if (otherNodes.length > 0) {
    groups.push({ name: "其他节点", type: "select", ...groupBaseOption, proxies: otherNodes, icon: ICON.Other });
    regionNames.push("其他节点");
  }

  // 3. 核心聚合组
  const manualNames = ruleOptionsEnable["手动选择"] ? [...regionNames] : [];
  groups.unshift({ name: "默认代理", type: "select", ...groupBaseOption, proxies: [...regionNames, FALLBACK_GROUP_NAME], icon: ICON.Proxy });
  groups.unshift({ name: "手动选择", type: "select", ...groupBaseOption, proxies: manualNames.length ? manualNames : ["国内直连"], icon: ICON.Manual });
  groups.unshift({ name: "国内直连", type: "select", ...groupBaseOption, proxies: DIRECT_PROXIES.map(p => p.name), icon: ICON.China, hidden: true });

  // 4. 场景组（默认值：AI/Google→美国；OneDrive→默认代理；Microsoft/Apple→国内直连）
  const usName = regionNames.includes("美国") ? "美国" : null;
  const svcList = ["默认代理", "手动选择", "国内直连", ...(usName ? [usName] : []), FALLBACK_GROUP_NAME];
  const svcProxies = addAllNodes ? allProxyNames : svcList;
  const svc = (name, icon, def) => ({ name, type: "select", ...groupBaseOption, proxies: svcProxies, icon, ...(def ? { "default-selected": def } : {}) });
  const services = [];
  if (ruleOptionsEnable.AI) services.push(svc("AI", ICON.AI, usName));
  if (ruleOptionsEnable.Google) services.push(svc("Google", ICON.Google, usName));
  if (ruleOptionsEnable.OneDrive) services.push(svc("OneDrive", ICON.OneDrive, "默认代理"));
  if (ruleOptionsEnable.Microsoft) services.push(svc("Microsoft", ICON.Microsoft, "国内直连"));
  if (ruleOptionsEnable.Apple) services.push(svc("Apple", ICON.Apple, "国内直连"));

  // 5. 组装：核心三组 + 地区组 + 场景组 + 漏网之鱼 + 兜底
  return [
    ...groups,
    ...services,
    { name: "漏网之鱼", type: "select", ...groupBaseOption, proxies: ["默认代理", "手动选择", "国内直连", FALLBACK_GROUP_NAME], icon: ICON.MATCH, "default-selected": "默认代理" },
    { name: FALLBACK_GROUP_NAME, ...FALLBACK_BASE, proxies: allProxyNames },
  ];
}

// 规则块（clashmi.yml 分层优先级精简版）
const RULES_PRIVATE = ["RULE-SET,private_ip,国内直连,no-resolve","RULE-SET,private_domain,国内直连","RULE-SET,ntp_domain,国内直连"];
// 国内直连加速：游戏/Apple/MS 国内段（必须先于业务规则，避免国内流量被业务组抢走）
const RULES_CN_FAST = ["RULE-SET,games_cn,国内直连","RULE-SET,epicgames,国内直连","RULE-SET,nvidia_cn,国内直连","RULE-SET,apple_cn,国内直连","RULE-SET,microsoft_cn,国内直连","DOMAIN,fsend.cn,国内直连","DOMAIN,international-gfe.download.nvidia.com,国内直连","DOMAIN-SUFFIX,hdslb.com,国内直连"];
// 自定义本地规则（clashmi.yml 优势）
const RULES_MY = ["RULE-SET,my_proxy,默认代理","RULE-SET,my_direct,国内直连"];
// 场景组规则
const RULES_AI = ["RULE-SET,openai_domain,AI","RULE-SET,anthropic_domain,AI","RULE-SET,google-gemini_domain,AI"];
const RULES_GOOGLE = ["RULE-SET,google_domain,Google","RULE-SET,google_ip,Google,no-resolve"];
const RULES_ONEDRIVE = ["RULE-SET,onedrive_domain,OneDrive"];
const RULES_MS = ["RULE-SET,microsoft_domain,Microsoft"];
const RULES_APPLE = ["RULE-SET,apple_domain,Apple","RULE-SET,apple_ip,Apple,no-resolve"];
// 国内直连收尾（clashmi.yml 第十层）
const RULES_CN_TAIL = ["RULE-SET,ResourceSite,国内直连","RULE-SET,PanVod,国内直连","RULE-SET,add_direct_domain,国内直连","RULE-SET,cn_domain,国内直连","RULE-SET,cn_ip,国内直连,no-resolve"];
// 屏蔽国外QUIC：国内 IP 放行，其余 UDP 443 REJECT
const RULES_QUIC = ["AND,((NETWORK,UDP),(DST-PORT,443),(NOT,((RULE-SET,cn_ip,no-resolve)))),REJECT"];

function buildRules() {
  return [
    ...(ruleOptionsEnable.AdBlock ? ["RULE-SET,adblock,REJECT"] : []),
    ...RULES_PRIVATE,
    ...RULES_CN_FAST,
    ...RULES_MY,
    ...(ruleOptionsEnable.AI ? RULES_AI : []),
    ...(ruleOptionsEnable.Google ? RULES_GOOGLE : []),
    ...(ruleOptionsEnable.OneDrive ? RULES_ONEDRIVE : []),
    ...(ruleOptionsEnable.Microsoft ? RULES_MS : []),
    ...(ruleOptionsEnable.Apple ? RULES_APPLE : []),
    ...RULES_CN_TAIL,
    ...(ruleOptionsEnable["屏蔽国外QUIC"] ? RULES_QUIC : []),
    // gfw 兜底：未命中业务规则的被墙域名走默认代理
    "RULE-SET,gfw,默认代理",
    "MATCH,漏网之鱼",
  ];
}

// 规则集（gh-proxy 镜像，国内可达）
const RULE_PROVIDERS = {
  ResourceSite: { type: "http", interval: 86400, behavior: "classical", format: "text", url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/eulac-dev/Proxy/refs/heads/main/Shadowrocket/Rules/ResourceSite.list" },
  PanVod: { type: "http", interval: 86400, behavior: "classical", format: "text", url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/eulac-dev/Proxy/refs/heads/main/Shadowrocket/Rules/PanVod.list" },
  ntp_domain: { type: "http", interval: 86400, behavior: "domain", format: "mrs", url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/category-ntp.mrs" },
  private_domain: { type: "http", interval: 86400, behavior: "domain", format: "mrs", url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/private.mrs" },
  // 国内直连加速（mihomoScript.js 参考源）
  games_cn: { type: "http", interval: 86400, behavior: "domain", format: "mrs", url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/category-games@cn.mrs" },
  epicgames: { type: "http", interval: 86400, behavior: "domain", format: "mrs", url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/epicgames.mrs" },
  nvidia_cn: { type: "http", interval: 86400, behavior: "domain", format: "mrs", url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/nvidia@cn.mrs" },
  apple_cn: { type: "http", interval: 86400, behavior: "domain", format: "mrs", url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/apple@cn.mrs" },
  microsoft_cn: { type: "http", interval: 86400, behavior: "domain", format: "mrs", url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/microsoft@cn.mrs" },
  // AI 规则源
  openai_domain: { type: "http", interval: 86400, behavior: "domain", format: "mrs", url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/openai.mrs" },
  anthropic_domain: { type: "http", interval: 86400, behavior: "domain", format: "mrs", url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/anthropic.mrs" },
  "google-gemini_domain": { type: "http", interval: 86400, behavior: "domain", format: "mrs", url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/google-gemini.mrs" },
  google_domain: { type: "http", interval: 86400, behavior: "domain", format: "mrs", url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/google.mrs" },
  google_ip: { type: "http", interval: 86400, behavior: "ipcidr", format: "mrs", url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geoip/google.mrs" },
  // 微软生态
  onedrive_domain: { type: "http", interval: 86400, behavior: "domain", format: "mrs", url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/onedrive.mrs" },
  microsoft_domain: { type: "http", interval: 86400, behavior: "domain", format: "mrs", url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/microsoft.mrs" },
  apple_domain: { type: "http", interval: 86400, behavior: "domain", format: "mrs", url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/apple.mrs" },
  apple_ip: { type: "http", interval: 86400, behavior: "ipcidr", format: "mrs", url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo-lite/geoip/apple.mrs" },
  // 国内收尾
  cn_domain: { type: "http", interval: 86400, behavior: "domain", format: "mrs", url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/cn.mrs" },
  cn_ip: { type: "http", interval: 86400, behavior: "ipcidr", format: "mrs", url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geoip/cn.mrs" },
  add_direct_domain: { type: "http", interval: 86400, behavior: "domain", format: "mrs", url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/Seven1echo/Yaml/refs/heads/main/rules/Seven1_Direct_Domain.mrs" },
  // 自定义本地规则（clashmi.yml 优势）
  my_direct: { type: "http", interval: 86400, behavior: "classical", format: "text", url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/cgoder/clash_rules/main/rules/my_direct.list" },
  my_proxy: { type: "http", interval: 86400, behavior: "classical", format: "text", url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/cgoder/clash_rules/main/rules/my_proxy.list" },
  // 基础设施
  private_ip: { type: "http", interval: 86400, behavior: "ipcidr", format: "mrs", url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geoip/private.mrs" },
  "geolocation_not_cn": { type: "http", interval: 86400, behavior: "domain", format: "mrs", url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/geolocation-!cn.mrs" },
  gfw: { type: "http", interval: 86400, behavior: "domain", format: "mrs", url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/gfw.mrs" },
  // AdBlock（仅 ruleOptionsEnable.AdBlock 开启时下发，默认不下载）
  adblock: { type: "http", interval: 86400, behavior: "domain", format: "mrs", url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/217heidai/adblockfilters/main/rules/adblockmihomolite.mrs" },
};

// DNS/hosts（clashmi.yml 细节 + anti-deadlock：my_direct 等国内直连域名必须走国内 DNS 解析）
function buildDnsAndHosts() {
  const chinaDNS = ["223.5.5.5", "119.29.29.29"];
  const chinaDoh = ["https://223.5.5.5/dns-query#DIRECT"];
  // 默认 nameserver 用国内直连 DoH（clashmi.yml 方案）：节点全挂时国内/直连流量 DNS 不断；
  // 国外域名由 geolocation_not_cn policy 走代理 DoH（出口解析质量最优）
  const domesticDoh = ["https://doh.pub/dns-query", "https://dns.alidns.com/dns-query"];
  const foreignDohViaProxy = ["https://cloudflare-dns.com/dns-query#默认代理", "https://dns.google/dns-query#默认代理"];
  return {
    dns: {
      enable: true, ipv6: false, listen: "0.0.0.0:7874",
      "enhanced-mode": "fake-ip", "fake-ip-range": "198.18.0.1/16",
      "fake-ip-filter": ["+.orb.local", "localhost", "*.home.arpa", "time.*.com", "ntp.*.com", "+.ntp.org", "+.pool.ntp.org", "captive.apple.com", "connectivitycheck.gstatic.com", "+.msftconnecttest.com", "+.msftncsi.com", "stun.*.*", "+.stun.playstation.net", "+.xboxlive.com", "+.speedtest.net"],
      "default-nameserver": chinaDNS,
      "proxy-server-nameserver": chinaDoh,
      nameserver: domesticDoh,
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

// 节点过滤（Script.js 语义：匹配地区的节点永不丢；仅过滤"无地区标识且命中噪音词"的节点）
function filterAndNormalizeProxies(allProxies) {
  const out = [];
  const seen = new Set();
  for (const p of (allProxies || [])) {
    const name = renameIfGroupNameCollision(p.name); // 防 loop：节点不得与组同名
    if (INVALID_PROXY_RE.test(name)) continue; // 机场信息节点必丢
    const isRegion = REGION_ALL.test(name);
    if (ruleOptionsEnable["过滤非地区节点"] && !isRegion && excludeFilter.test(name)) continue;
    if (!seen.has(name)) { seen.add(name); out.push(name === p.name ? p : { ...p, name }); }
  }
  if (out.length === 0) throw new Error("配置文件中未找到任何代理节点，请检查订阅");
  return out;
}

// ===== 主函数（BettBox 入口：返回 newConfig 全量对象，切勿直接改 config）=====
function main(config) {
  const log = (...args) => OPTIONS.LOG_VERBOSE && console.log(...args);
  log("🚀 clashmi_lite.js v1.0（Script.js × clashmi.yml 融合简版）");
  try {
    const filteredProxies = filterAndNormalizeProxies(config.proxies);
    const allProxyNames = filteredProxies.map(p => p.name);
    log(`📦 有效节点 ${allProxyNames.length}/${(config.proxies || []).length}`);

    // 1. 构建策略组 + 防御性空组清理（解决 Go: use or proxies missing）
    let proxyGroups = buildProxyGroups(allProxyNames);
    const empty = new Set(proxyGroups.filter(g => !g.proxies || g.proxies.length === 0).map(g => g.name));
    if (empty.size > 0) {
      log(`⚠️ 剔除空组: ${[...empty].join("、")}`);
      proxyGroups = proxyGroups.filter(g => !empty.has(g.name));
      for (const g of proxyGroups) if (Array.isArray(g.proxies)) {
        const before = g.proxies.length; g.proxies = g.proxies.filter(p => !empty.has(p));
        if (g.proxies.length === 0) g.proxies = ["DIRECT"];
        if (g.proxies.length !== before) log(`  ↳ 已清理 [${g.name}] 的空引用`);
      }
    }
    for (const g of proxyGroups) if (!g.proxies || g.proxies.length === 0) throw new Error(`策略组 ${g.name} 为空`);

    // 2. DNS/hosts（解决 Dart: _Map is not subtype of String）
    const { dns, hosts } = OPTIONS.OVERRIDE_DNS ? buildDnsAndHosts() : { dns: config.dns, hosts: config.hosts };

    // 3. 全量 newConfig（参照 mihomoScript.js）
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
    if (OPTIONS.OVERRIDE_TUN) newConfig["tun"] = { enable: true, stack: "system", mtu: 1300, "auto-route": true, "strict-route": true, "auto-redirect": true, "auto-detect-interface": true, "endpoint-independent-nat": true, "route-exclude-cidr": ["192.168.0.0/16", "10.0.0.0/8", "172.16.0.0/12", "100.64.0.0/10", "169.254.0.0/16", "fc00::/7", "fe80::/10"], "loopback-address": ["10.7.0.1"], "dns-hijack": ["any:53", "tcp://any:53"] };
    if (OPTIONS.OVERRIDE_SNIFFER) newConfig["sniffer"] = { enable: true, "override-destination": true, "parse-pure-ip": true, "force-dns-mapping": true, sniff: { QUIC: { ports: [443, 8443] }, TLS: { ports: [443, 8443] }, HTTP: { ports: [80, "8080-8880"], "override-destination": true } }, "force-domain": ["+.netflix.com", "+.nflxvideo.net", "+.googlevideo.com", "+.youtube.com", "+.telegram.org", "+.t.me", "+.twitter.com", "+.twimg.com", "+.tiktok.com", "+.amazonaws.com"], "skip-domain": ["+.apple.com", "Mijia Cloud", "dlg.io.mi.com", "+.oray.com", "+.sunlogin.net"] };
    newConfig["proxies"] = [...DIRECT_PROXIES, ...filteredProxies];
    newConfig["proxy-groups"] = proxyGroups;
    // 开关联动：关闭的场景组不下发对应规则集
    const providers = { ...RULE_PROVIDERS };
    const PROVIDER_BY_SWITCH = {
      AI: ["openai_domain", "anthropic_domain", "google-gemini_domain"],
      Google: ["google_domain", "google_ip"],
      OneDrive: ["onedrive_domain"],
      Microsoft: ["microsoft_domain"],
      Apple: ["apple_domain", "apple_ip"],
    };
    for (const [sw, list] of Object.entries(PROVIDER_BY_SWITCH)) {
      if (!ruleOptionsEnable[sw]) for (const p of list) delete providers[p];
    }
    if (!ruleOptionsEnable.AdBlock) delete providers.adblock;
    newConfig["rule-providers"] = OPTIONS.OVERRIDE_RULES ? providers : { ...(config["rule-providers"] || {}), ...providers };
    newConfig["rules"] = OPTIONS.OVERRIDE_RULES ? buildRules() : [...buildRules(), ...(config.rules || [])];
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
