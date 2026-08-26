// 适配 BettBox 自定义配置参数（保持与 mihomoScript.js 一致）
// ⚠️ 必须位于文件前 2000 字符内：BettBox 仅检查 head.substring(0,2000) 是否含
//    'Compatible_With_Bettbox'（lib/models/common.dart isCompatibleWithBettbox），
//    否则策略组面板不显示 ruleOptionsEnable 开关菜单
const Compatible_With_Bettbox = { ruleOptionsEnable: true };

// ============================================================
// 🔧 clashmi_lite.js v1.6 — 简版覆写脚本
// 设计：Script.js（AIsouler/MyClash 精简版）骨架 × clashmi.yml 优势融合
// 参考：https://raw.githubusercontent.com/AIsouler/MyClash/main/Script/Script.js
// ⏰ 更新时间: 2026-08-25 18:30:00 CST
//
// v1.6 变更（地区分组锁死：全挂宁断不叛逃，兜底仅手动）：
// - 根因：健康检测实验（本地 mihomo + 波动 mock）证明——lazy:false 持续检查时
//   节点检查失败即判死（max-failed-times 只影响补测，不影响判死），地区节点经历
//   共同链路波动时全部判死，v1.5 的 XX-兜底 fallback 层会切到全局兜底 → 美国流量
//   打到日本；且 fallback 引用 url-test 组的判定行为本身不可靠（mihomo #2452）
// - 修复：删除 XX-兜底 fallback 包装；地区 select 组 = [XX-自动选择(纯节点url-test),
//   ...地区节点, 兜底自动选择(手动选项垫底)]。地区全挂 → 连接失败（宁断不叛逃），
//   节点恢复后 url-test 自动切回；兜底自动选择 仅在用户手动选择时生效
// - 健康参数：timeout 2000→5000（减少链路波动误判，社区建议值）
//
// v1.5 变更（修复地区自动选择组"低延迟叛逃"：美国流量打到日本节点）：
// - 根因：XX-自动选择（url-test）成员里直接挂了全局兜底组，url-test 语义是"选最快
//   候选"，不区分候选是否本地区——只要兜底组当前节点（如日本）延迟更低或本地区
//   节点稍慢，美国组流量就叛逃到日本（本地 mihomo 实证复现）
// - 修复：XX-自动选择只含本地区节点；新增隐藏 XX-兜底（fallback 顺序故障转移）=
//   [XX-自动选择, 兜底自动选择]——本地区有活节点走本地区最快，本地区全挂才切全局
//   兜底；地区 select 组默认选中 XX-兜底
//
// v1.4 变更（修复 GitHub 被 microsoft_domain 规则集截走导致直连，同 clashmi_flclash.js v2.9）：
// - 根因：MetaCubeX geosite/microsoft 分类 include 全部 github 域名（v2fly 数据源
//   microsoft 首行 include:github），RULE-SET,microsoft_domain 命中 github 域名，
//   而 Microsoft 组默认国内直连 → GitHub 无法访问
// - 修复：github_domain 规则独立前置（优先于 microsoft 规则）→ 默认代理；
//   github_domain 规则集加入常驻 BASE
//
// v1.3 变更（吸收 mihomoScript.js 架构优点）：
// - 数据驱动 serviceConfigs：服务 = 组+规则+规则集 单点定义，删除 PROVIDER_BY_SWITCH
// - normalizeProxyName 国旗标准化 + regionMatchCache 正则缓存（节点治理管道）
// - GLOBAL 全量聚合组；exclude-type DIRECT（UT 测速排除直连）
// - DNS 增强：use-hosts/use-system-hosts/cache-algorithm arc/direct-nameserver/
//   fake-ip-filter 规则集级条目；hosts 多 IP 数组兑底
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

// 国旗正则（emoji 地区标识）
const FLAG_RE = /[\u{1F1E6}-\u{1F1FF}]{2}/u;
// 节点分类缓存：避免地区正则对同一节点名重复执行（参考配置 regionMatchCache）
const regionMatchCache = new Map();
function classifyNode(name) {
  const cached = regionMatchCache.get(name);
  if (cached) return cached;
  const regions = [];
  for (const [rname,, re] of REGION_ORDER) if (re.test(name)) regions.push(rname);
  regionMatchCache.set(name, regions);
  return regions;
}
// 标准化节点名：保留原国旗；无国旗时按匹配地区补国旗；折叠多余空格（参考配置 normalizeProxyName）
function normalizeProxyName(proxy) {
  const name = proxy.name;
  const flag = name.match(FLAG_RE)?.[0];
  const nameWithoutFlag = (flag ? name.replace(flag, "") : name).replace(/\s+/g, " ").trim();
  const regions = classifyNode(name);
  const regionFlag = flag || REGION_ORDER.find(([rname]) => regions.includes(rname))?.[1];
  const normalized = regionFlag ? `${regionFlag} ${nameWithoutFlag}` : nameWithoutFlag;
  return normalized === name ? proxy : { ...proxy, name: normalized };
}

// 策略组名集合：节点名不得与任何组名相同，否则 mihomo 解析时组名覆盖节点名，
// 该节点在组 proxies 里被当作组引用 → 自环 → "loop is detected in ProxyGroup"
// （真实案例：订阅里有节点叫"台湾"，与地区组同名触发；标准化补国旗后地区冲突自动消失）
const GROUP_NAMES = new Set([
  "默认代理", "手动选择", "国内直连",
  "香港", "日本", "台湾", "新加坡", "美国", "其他节点",
  "香港-自动选择", "日本-自动选择", "台湾-自动选择", "新加坡-自动选择", "美国-自动选择",
  "AI", "Google", "OneDrive", "Microsoft", "Apple", "漏网之鱼", "兜底自动选择",
]);
// 冲突节点重命名：标准化后仍与组同名的（无地区标识的），加"节点"后缀
function renameIfGroupNameCollision(name) {
  return GROUP_NAMES.has(name) ? `${name}节点` : name;
}

// 策略组公共配置（v2.2 健康检查调优：常驻检测 + 快速失败 + 快速剔除死节点）
const groupBaseOption = {
  interval: 300, timeout: 5000, url: "https://www.g.cn/generate_204",
  lazy: false, "max-failed-times": 2, "empty-fallback": "DIRECT",
};
const UT_BASE = { type: "url-test", tolerance: 100, ...groupBaseOption, hidden: true, "exclude-type": "DIRECT" };
// fallback 兜底组（顺序故障转移）：地区节点全挂时自动切到任意活节点，避免 url-test 粘死
const FALLBACK_GROUP_NAME = "兜底自动选择";
const FALLBACK_BASE = { type: "fallback", ...groupBaseOption, hidden: true };

// 地区定义（顺序即面板顺序）；含国旗（normalizeProxyName 用）
const REGION_ORDER = [
  ["香港", "🇭🇰", RE.HK, ICON.HK], ["日本", "🇯🇵", RE.JP, ICON.JP],
  ["台湾", "🇹🇼", RE.TW, ICON.TW], ["新加坡", "🇸🇬", RE.SG, ICON.SG], ["美国", "🇺🇸", RE.US, ICON.US],
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
  const genAuto = ruleOptionsEnable["生成地区自动选择组"];
  const hideManual = ruleOptionsEnable["隐藏地区手动选择组"];
  const addAllNodes = ruleOptionsEnable["分流组添加所有节点"];

  // 1. 一次遍历分类（regionMatchCache 缓存正则结果）
  const byRegion = new Map();
  const otherNodes = [];
  for (const n of allProxyNames) {
    const regions = classifyNode(n);
    for (const r of regions) { if (!byRegion.has(r)) byRegion.set(r, []); byRegion.get(r).push(n); }
    if (regions.length === 0) otherNodes.push(n);
  }

  // 2. 地区组（select 手动 + 隐藏 url-test 自动子组；无节点不生成）
  const groups = [];
  const regionNames = [];
  for (const [name,, re, icon] of REGION_ORDER) {
    const nodes = byRegion.get(name) || [];
    if (nodes.length === 0) continue;
    const autoName = `${name}-自动选择`;
    const selectProxies = [];
    if (genAuto) {
      // url-test 纯本地区节点：v1.6 起不再用 fallback 包装（实验证明 fallback 引用
      // url-test 组判定不可靠且会叛逃），地区全挂时连接失败（宁断不叛逃），恢复自动切回
      groups.push({ name: autoName, ...UT_BASE, proxies: [...nodes], icon });
      selectProxies.push(autoName); // 放第一位 → 默认选中"自动选择"
    }
    selectProxies.push(...nodes, FALLBACK_GROUP_NAME); // 兜底自动选择 仅作手动选项垫底
    groups.push({ name, type: "select", ...groupBaseOption, proxies: selectProxies, icon, ...(hideManual ? { hidden: true } : {}) });
    regionNames.push(name);
  }

  // 3. 其他节点（未匹配五地区的节点，Script.js 兜底设计）
  if (otherNodes.length > 0) {
    groups.push({ name: "其他节点", type: "select", ...groupBaseOption, proxies: otherNodes, icon: ICON.Other });
    regionNames.push("其他节点");
  }

  // 4. 核心聚合组
  const manualNames = ruleOptionsEnable["手动选择"] ? [...regionNames] : [];
  groups.unshift({ name: "默认代理", type: "select", ...groupBaseOption, proxies: [...regionNames, FALLBACK_GROUP_NAME], icon: ICON.Proxy });
  groups.unshift({ name: "手动选择", type: "select", ...groupBaseOption, proxies: manualNames.length ? manualNames : ["国内直连"], icon: ICON.Manual });
  groups.unshift({ name: "国内直连", type: "select", ...groupBaseOption, proxies: DIRECT_PROXIES.map(p => p.name), icon: ICON.China, hidden: true });

  // 5. 场景组（数据驱动 serviceConfigs：组+规则+规则集三联动）
  const usName = regionNames.includes("美国") ? "美国" : null;
  const svcList = ["默认代理", "手动选择", "国内直连", ...(usName ? [usName] : []), FALLBACK_GROUP_NAME];
  const proxyLists = { svc: addAllNodes ? allProxyNames : svcList };
  const services = [];
  const serviceRules = [];
  const serviceProviders = {};
  for (const svc of serviceConfigs) {
    if (!ruleOptionsEnable[svc.sw]) continue;
    for (const g of svc.groups) {
      const def = g.def === "us" ? usName : (g.def === "default" ? "默认代理" : g.def);
      services.push({ name: g.name, type: "select", ...groupBaseOption, proxies: proxyLists[svc.proxiesKey], icon: g.icon, ...(def ? { "default-selected": def } : {}) });
    }
    serviceRules.push(...svc.rules);
    Object.assign(serviceProviders, svc.providers);
  }

  // 6. 组装：GLOBAL + 核心三组 + 地区组 + 场景组 + 漏网之鱼 + 兜底
  const groupsAll = [
    ...groups,
    ...services,
    { name: "漏网之鱼", type: "select", ...groupBaseOption, proxies: ["默认代理", "手动选择", "国内直连", FALLBACK_GROUP_NAME], icon: ICON.MATCH, "default-selected": "默认代理" },
    { name: FALLBACK_GROUP_NAME, ...FALLBACK_BASE, proxies: allProxyNames },
  ];
  // GLOBAL 全量聚合组（参考配置主入口；BettBox 面板首位）
  const globalProxies = groupsAll.map(g => g.name);
  groupsAll.unshift({ name: "GLOBAL", type: "select", ...groupBaseOption, proxies: globalProxies, icon: ICON.Proxy });
  return { groups: groupsAll, serviceRules, serviceProviders };
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

function buildRules(serviceRules) {
  return [
    ...(ruleOptionsEnable.AdBlock ? ["RULE-SET,adblock,REJECT"] : []),
    ...RULES_PRIVATE,
    ...RULES_CN_FAST,
    ...RULES_MY,
    // github 走默认代理（v1.4：microsoft_domain 规则集含 github 域名，必须先于 Microsoft 规则命中）
    "RULE-SET,github_domain,默认代理",
    ...serviceRules,
    ...RULES_CN_TAIL,
    ...(ruleOptionsEnable["屏蔽国外QUIC"] ? RULES_QUIC : []),
    // gfw 兜底：未命中业务规则的被墙域名走默认代理
    "RULE-SET,gfw,默认代理",
    "MATCH,漏网之鱼",
  ];
}

// MetaCubeX meta-rules-dat 规则集构造器（mrs 格式，gh-proxy 镜像国内可达）
const M = (file, behavior = "domain") => ({ type: "http", interval: 86400, behavior, format: "mrs", url: `https://v4.gh-proxy.org/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/${file}.mrs` });
const MI = (file) => ({ type: "http", interval: 86400, behavior: "ipcidr", format: "mrs", url: `https://v4.gh-proxy.org/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geoip/${file}.mrs` });
const MIG = (file) => ({ type: "http", interval: 86400, behavior: "ipcidr", format: "mrs", url: `https://v4.gh-proxy.org/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo-lite/geoip/${file}.mrs` });

// 服务定义（数据驱动，参考配置 serviceConfigs）：一个服务 = 组 + 规则 + 规则集 单点内聚
// def: 'us'=美国（无美国节点时省略默认值）/ 'default'=默认代理 / '国内直连'=字面量
const serviceConfigs = [
  { sw: "AI", proxiesKey: "svc", groups: [{ name: "AI", icon: ICON.AI, def: "us" }], rules: RULES_AI, providers: { openai_domain: M("openai"), anthropic_domain: M("anthropic"), "google-gemini_domain": M("google-gemini") } },
  { sw: "Google", proxiesKey: "svc", groups: [{ name: "Google", icon: ICON.Google, def: "us" }], rules: RULES_GOOGLE, providers: { google_domain: M("google"), google_ip: MI("google") } },
  { sw: "OneDrive", proxiesKey: "svc", groups: [{ name: "OneDrive", icon: ICON.OneDrive, def: "default" }], rules: RULES_ONEDRIVE, providers: { onedrive_domain: M("onedrive") } },
  { sw: "Microsoft", proxiesKey: "svc", groups: [{ name: "Microsoft", icon: ICON.Microsoft, def: "国内直连" }], rules: RULES_MS, providers: { microsoft_domain: M("microsoft") } },
  { sw: "Apple", proxiesKey: "svc", groups: [{ name: "Apple", icon: ICON.Apple, def: "国内直连" }], rules: RULES_APPLE, providers: { apple_domain: M("apple"), apple_ip: MIG("apple") } },
];

// 规则集（gh-proxy 镜像，国内可达）
const RULE_PROVIDERS_BASE = {
  ResourceSite: { type: "http", interval: 86400, behavior: "classical", format: "text", url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/eulac-dev/Proxy/refs/heads/main/Shadowrocket/Rules/ResourceSite.list" },
  PanVod: { type: "http", interval: 86400, behavior: "classical", format: "text", url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/eulac-dev/Proxy/refs/heads/main/Shadowrocket/Rules/PanVod.list" },
  ntp_domain: M("category-ntp"),
  private_domain: M("private"),
  // 国内直连加速（mihomoScript.js 参考源）
  games_cn: M("category-games@cn"),
  epicgames: M("epicgames"),
  nvidia_cn: M("nvidia@cn"),
  apple_cn: M("apple@cn"),
  microsoft_cn: M("microsoft@cn"),
  // 国内收尾
  cn_domain: M("cn"),
  cn_ip: MI("cn"),
  add_direct_domain: { type: "http", interval: 86400, behavior: "domain", format: "mrs", url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/Seven1echo/Yaml/refs/heads/main/rules/Seven1_Direct_Domain.mrs" },
  // 自定义本地规则（clashmi.yml 优势）
  my_direct: { type: "http", interval: 86400, behavior: "classical", format: "text", url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/cgoder/clash_rules/main/rules/my_direct.list" },
  my_proxy: { type: "http", interval: 86400, behavior: "classical", format: "text", url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/cgoder/clash_rules/main/rules/my_proxy.list" },
  // 基础设施
  private_ip: MI("private"),
  "geolocation_not_cn": M("geolocation-!cn"),
  gfw: M("gfw"),
  // github 独立代理规则集（v1.4：microsoft.mrs 含 github 域名，规则必须前置）
  github_domain: M("github"),
  // fake-ip-filter 配套规则集（mihomoScript.js 参考源 wwqgtxx/clash-rules，分支 release 用 / 不用 @）
  fakeip_filter: { type: "http", interval: 86400, behavior: "domain", format: "mrs", url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/wwqgtxx/clash-rules/release/fakeip-filter.mrs" },
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
      // mihomoScript.js 参考源细节：系统 hosts 读取 + ARC 缓存 + hosts 生效开关
      "use-hosts": true, "use-system-hosts": true, "cache-algorithm": "arc",
      "enhanced-mode": "fake-ip", "fake-ip-range": "198.18.0.1/16",
      // 规则集级 fake-ip-filter（参考配置）：私有/中国大陆/常见无需 fake-ip 的域名走真实 IP
      "fake-ip-filter": ["rule-set:private_domain", "rule-set:fakeip_filter", "rule-set:cn_domain", "+.orb.local", "localhost", "*.home.arpa", "time.*.com", "ntp.*.com", "+.ntp.org", "+.pool.ntp.org", "captive.apple.com", "connectivitycheck.gstatic.com", "+.msftconnecttest.com", "+.msftncsi.com", "stun.*.*", "+.stun.playstation.net", "+.xboxlive.com", "+.speedtest.net"],
      "default-nameserver": chinaDNS,
      "proxy-server-nameserver": chinaDoh,
      nameserver: domesticDoh,
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

// 节点过滤（Script.js 语义：匹配地区的节点永不丢；仅过滤"无地区标识且命中噪音词"的节点）
// 流程：国旗标准化 → 防组名冲突重命名 → 硬噪音过滤 → 噪音词过滤 → 去重
function filterAndNormalizeProxies(allProxies) {
  regionMatchCache.clear(); // 清缓存，防上次运行残留旧名称
  const out = [];
  const seen = new Set();
  for (const p of (allProxies || [])) {
    const normalized = normalizeProxyName(p);
    let name = renameIfGroupNameCollision(normalized.name); // 防 loop：节点不得与组同名
    if (INVALID_PROXY_RE.test(name)) continue; // 机场信息节点必丢
    const isRegion = classifyNode(name).length > 0;
    if (ruleOptionsEnable["过滤非地区节点"] && !isRegion && excludeFilter.test(name)) continue;
    if (!seen.has(name)) { seen.add(name); out.push(name === p.name ? p : { ...p, name }); }
  }
  if (out.length === 0) throw new Error("配置文件中未找到任何代理节点，请检查订阅");
  return out;
}

// ===== 主函数（BettBox 入口：返回 newConfig 全量对象，切勿直接改 config）=====
function main(config) {
  const log = (...args) => OPTIONS.LOG_VERBOSE && console.log(...args);
  log("🚀 clashmi_lite.js v1.6（Script.js × clashmi.yml 融合简版）");
  try {
    const filteredProxies = filterAndNormalizeProxies(config.proxies);
    const allProxyNames = filteredProxies.map(p => p.name);
    log(`📦 有效节点 ${allProxyNames.length}/${(config.proxies || []).length}`);

    // 1. 构建策略组（数据驱动：组+规则+规则集三联动） + 防御性空组清理（解决 Go: use or proxies missing）
    let { groups: proxyGroups, serviceRules, serviceProviders } = buildProxyGroups(allProxyNames);
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
    // 开关联动：关闭的场景组不下发对应规则集（数据驱动：providers 内聚在 serviceConfigs）
    const providers = { ...RULE_PROVIDERS_BASE, ...serviceProviders };
    if (!ruleOptionsEnable.AdBlock) delete providers.adblock;
    newConfig["rule-providers"] = OPTIONS.OVERRIDE_RULES ? providers : { ...(config["rule-providers"] || {}), ...providers };
    newConfig["rules"] = OPTIONS.OVERRIDE_RULES ? buildRules(serviceRules) : [...buildRules(serviceRules), ...(config.rules || [])];
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
