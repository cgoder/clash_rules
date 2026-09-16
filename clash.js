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
const REGION_DEFINITIONS = [
  { name: "香港", code: "HK", flag: "🇭🇰", icon: ICON.HK, re: /(香港|🇭🇰|(?<![A-Za-z])HKG?(?![A-Za-z])|hong\s*kong)/i },
  { name: "日本", code: "JP", flag: "🇯🇵", icon: ICON.JP, re: /(日本|东京|大阪|京都|🇯🇵|(?<![A-Za-z])JPN?(?![A-Za-z])|japan)/i },
  { name: "台湾", code: "TW", flag: "🇹🇼", icon: ICON.TW, re: /(台湾|台灣|台北|高雄|🇹🇼|(?<![A-Za-z])TWN?(?![A-Za-z])|taiwan)/i },
  { name: "新加坡", code: "SG", flag: "🇸🇬", icon: ICON.SG, re: /(新加坡|狮城|🇸🇬|(?<![A-Za-z])SGP?(?![A-Za-z])|singapore)/i },
  { name: "美国", code: "US", flag: "🇺🇸", icon: ICON.US, re: /(美国|美國|纽约|洛杉矶|旧金山|芝加哥|西雅图|硅谷|波士顿|华盛顿|🇺🇸|(?<![A-Za-z])USA?(?![A-Za-z])|america|united\s*states)/i },
  { name: "韩国", code: "KR", flag: "🇰🇷", icon: ICON.KR, re: /(韩国|韓國|首尔|仁川|🇰🇷|(?<![A-Za-z])KOR?(?![A-Za-z])|korea)/i },
  { name: "英国", code: "UK", flag: "🇬🇧", icon: ICON.UK, re: /(英国|英國|伦敦|曼彻斯特|🇬🇧|(?<![A-Za-z])(?:UK|GBR?)(?![A-Za-z])|britain|united\s*kingdom)/i },
  { name: "德国", code: "DE", flag: "🇩🇪", icon: ICON.DE, re: /(德国|德國|法兰克福|柏林|🇩🇪|(?<![A-Za-z])DEU?(?![A-Za-z])|germany|deutschland)/i },
  { name: "法国", code: "FR", flag: "🇫🇷", icon: ICON.FR, re: /(法国|法國|巴黎|🇫🇷|(?<![A-Za-z])FRA?(?![A-Za-z])|france)/i },
  { name: "澳大利亚", code: "AU", flag: "🇦🇺", icon: ICON.AU, re: /(澳大利亚|澳大利亞|澳洲|悉尼|墨尔本|🇦🇺|(?<![A-Za-z])AUS?(?![A-Za-z])|australia)/i },
];

// Emoji 国旗匹配正则
const FLAG_RE = /[\u{1F1E6}-\u{1F1FF}]{2}/u;

// 地区分类缓存：提升大批量节点正则匹配性能
const regionMatchCache = new Map();
function classifyNode(name) {
  const cached = regionMatchCache.get(name);
  if (cached) return cached;
  const matched = [];
  for (const reg of REGION_DEFINITIONS) {
    if (reg.re.test(name)) matched.push(reg.name);
  }
  regionMatchCache.set(name, matched);
  return matched;
}

// 节点名称归一化：补齐地区国旗、清洗连续多余空格
function normalizeProxyName(proxy) {
  const name = proxy.name;
  const existingFlag = name.match(FLAG_RE)?.[0];
  const cleanName = (existingFlag ? name.replace(existingFlag, "") : name).replace(/\s+/g, " ").trim();
  const matchedRegions = classifyNode(name);
  const targetFlag = existingFlag || REGION_DEFINITIONS.find(r => matchedRegions.includes(r.name))?.flag;
  const normalized = targetFlag ? `${targetFlag} ${cleanName}` : cleanName;
  return normalized === name ? proxy : { ...proxy, name: normalized };
}

// 保留策略组名称清单（防 Loop detected 自环）
const RESERVED_GROUP_NAMES = new Set([
  "GLOBAL", "默认代理", "手动选择", "国内直连", "漏网之鱼", "兜底自动选择", "其他节点",
  "Apple Push", "APNs-Fallback",
  ...REGION_DEFINITIONS.map(r => r.name),
  ...REGION_DEFINITIONS.map(r => `${r.name}-自动选择`),
  "AI", "Google", "YouTube", "OneDrive", "GitHub", "Microsoft", "Apple",
  "DIRECT", "REJECT", "REJECT-DROP", "PASS", "COMPATIBLE",
]);

// 节点重命名防自环：节点名称不得与策略组同名，否则 Mihomo 将节点当作组引用引发自环崩溃
function renameIfCollidesWithGroup(name) {
  return RESERVED_GROUP_NAMES.has(name) ? `${name}节点` : name;
}

// 策略组通用基础配置（遵循官方最佳实践：统一采用 http gstatic 204 Anycast 测速，开启 lazy 规避并发风暴）
const GROUP_BASE_OPTION = {
  interval: 300,
  timeout: 5000,
  url: "http://www.gstatic.com/generate_204",
  lazy: true,
  "max-failed-times": 3,
  "empty-fallback": "DIRECT",
};

// 地区 url-test 基础参数：纯本地区节点测速，宁断不叛逃
const UT_BASE = {
  type: "url-test",
  tolerance: 50,
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
};

// 多版本直连节点（面向不同网络栈调优）
const DIRECT_PROXIES = [
  { name: "DIRECT | 双栈", type: "direct" },
  { name: "DIRECT | IPv4优先", type: "direct", "ip-version": "ipv4-prefer" },
  { name: "DIRECT | IPv6优先", type: "direct", "ip-version": "ipv6-prefer" },
  { name: "DIRECT | 仅IPv4", type: "direct", "ip-version": "ipv4" },
  { name: "DIRECT | 仅IPv6", type: "direct", "ip-version": "ipv6" },
];

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
      ...GROUP_BASE_OPTION,
      proxies: selectProxies,
      icon: reg.icon,
      ...(hideManual ? { hidden: true } : {}),
    });
    activeRegionNames.push(reg.name);
  }

  // 3. 其他节点组（捕获 10 大区之外的有效小众节点）
  if (otherNodes.length > 0) {
    groups.push({
      name: "其他节点",
      type: "select",
      ...GROUP_BASE_OPTION,
      proxies: otherNodes,
      icon: ICON.Other,
    });
    activeRegionNames.push("其他节点");
  }

  // 4. 核心系统聚合组
  const manualProxies = ruleOptionsEnable["手动选择"] ? [...activeRegionNames] : [];
  groups.unshift({
    name: "默认代理",
    type: "select",
    ...GROUP_BASE_OPTION,
    proxies: [...activeRegionNames, FALLBACK_GROUP_NAME],
    icon: ICON.Proxy,
  });
  groups.unshift({
    name: "手动选择",
    type: "select",
    ...GROUP_BASE_OPTION,
    proxies: manualProxies.length ? manualProxies : ["国内直连"],
    icon: ICON.Manual,
  });
  groups.unshift({
    name: "国内直连",
    type: "select",
    ...GROUP_BASE_OPTION,
    proxies: DIRECT_PROXIES.map(p => p.name),
    icon: ICON.China,
    hidden: true,
  });

  // 5. 对齐官方最佳实践：Apple Push（APNs）专线故障转移
  if (ruleOptionsEnable["ApplePush专线保障"]) {
    // 专用 APNs-Fallback 组：优先用各地区 Auto，无 Auto 用全节点
    const apnsProxies = existingAutoNames.length ? existingAutoNames : allProxyNames;
    groups.push({
      name: "APNs-Fallback",
      type: "fallback",
      proxies: apnsProxies,
      icon: ICON.ApplePush,
      url: "http://captive.apple.com/hotspot-detect.html",
      interval: 300,
      hidden: true,
    });
    // Apple Push 主策略组：直连优先，代理故障转移作为后备选项，保证推送不掉线
    groups.push({
      name: "Apple Push",
      type: "fallback",
      icon: ICON.ApplePush,
      proxies: ["DIRECT", "APNs-Fallback"],
      url: "http://captive.apple.com/hotspot-detect.html",
      interval: 300,
    });
  }

  // 6. 7 大指定场景组（数据驱动挂载）
  const usName = activeRegionNames.includes("美国") ? "美国" : null;
  const standardSvcList = ["默认代理", "手动选择", "国内直连", ...(usName ? [usName] : []), FALLBACK_GROUP_NAME];
  const serviceProxies = addAllNodes ? allProxyNames : standardSvcList;

  const services = [];
  const serviceRules = [];
  const serviceProviders = {};

  for (const svc of SERVICE_CONFIGS) {
    if (!ruleOptionsEnable[svc.sw]) continue;
    const g = svc.group;
    const def = g.def === "us" ? usName : (g.def === "default" ? "默认代理" : g.def);
    services.push({
      name: g.name,
      type: "select",
      ...GROUP_BASE_OPTION,
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
      ...GROUP_BASE_OPTION,
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
  allGroups.unshift({
    name: "GLOBAL",
    type: "select",
    ...GROUP_BASE_OPTION,
    proxies: allGroups.map(g => g.name),
    icon: ICON.Proxy,
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
    `IP-CIDR6,2620:149:a44::/48,${targetApns},no-resolve`,
    `IP-CIDR6,2403:300:a42::/48,${targetApns},no-resolve`,
    `IP-CIDR6,2403:300:a51::/48,${targetApns},no-resolve`,
    `IP-CIDR6,2a01:b740:a42::/48,${targetApns},no-resolve`,
  ];

  // 3. 自定义规则优先（包含 SideStore 离线自续签端点，必须在 apple_cn 直连之前匹配）
  const rulesMy = [
    "RULE-SET,my_proxy,默认代理",
    "RULE-SET,my_direct,国内直连",
  ];

  // 4. 国内直连加速快路径
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
      "fc00::/7",
      "fe80::/10",
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

  for (const p of (proxies || [])) {
    if (!p || typeof p !== "object" || !p.name) continue;
    const normalized = normalizeProxyName(p);
    let name = renameIfCollidesWithGroup(normalized.name);

    // 硬噪音清洗
    if (INVALID_PROXY_RE.test(name)) continue;

    // 软噪音过滤（仅当无地区匹配时过滤）
    const isRegional = classifyNode(name).length > 0;
    if (ruleOptionsEnable["过滤非地区节点"] && !isRegional && EXCLUDE_KEYWORD_RE.test(name)) {
      continue;
    }

    if (!seenNames.has(name)) {
      seenNames.add(name);
      validProxies.push(name === p.name ? p : { ...p, name });
    }
  }

  if (validProxies.length === 0) {
    throw new Error("clash.js: 配置文件中未找到任何可用代理节点，请检查订阅源");
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

    // 1. 节点过滤治理与去重归一化
    const filteredProxies = filterAndNormalizeProxies(config && config.proxies);
    const allProxyNames = filteredProxies.map(p => p.name);
    log(`✨ 有效节点治理完成: ${allProxyNames.length}/${(config.proxies || []).length}`);

    // 2. 构建策略组与规则
    let { groups: proxyGroups, serviceRules, serviceProviders } = buildProxyGroups(allProxyNames);

    // 3. 空组自愈防御（避免 proxies 为空导致内核报错）
    const emptyGroups = new Set(proxyGroups.filter(g => !g.proxies || g.proxies.length === 0).map(g => g.name));
    if (emptyGroups.size > 0) {
      log(`⚠️ 防御清理空组: ${[...emptyGroups].join("、")}`);
      proxyGroups = proxyGroups.filter(g => !emptyGroups.has(g.name));
      for (const g of proxyGroups) {
        if (Array.isArray(g.proxies)) {
          g.proxies = g.proxies.filter(p => !emptyGroups.has(p));
          if (g.proxies.length === 0) g.proxies = ["DIRECT"];
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
