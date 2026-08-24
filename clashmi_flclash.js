// ============================================================
// 🔧 clashmi.yml → FLClash JS Override 完整移植版  v1.0
// 基于 clashmi.yml 1:1 转换（锚点、策略组、规则、DNS、TUN、嗅探 均保持一致）
//
// ✅ 功能：
// 1. 完全复刻 clashmi.yml 的 25 个策略组（含 10 个隐藏的 LB/UT 组 + 4 个大洲手动组）
// 2. 复刻全部 33 个 rule-providers + 32 条 rules（含 my_proxy / my_direct）
// 3. 覆盖 DNS / TUN / Sniffer / Profile / 外部面板 等核心配置
// 4. 自动按正则过滤订阅节点（等价于 clashmi.yml 的 filter + include-all）
// 5. 细粒度覆写开关 + 详细日志
//
// ✅ 使用：
// FLClash → 配置 → 覆写 → 脚本模式 → 粘贴本脚本 → 保存
// 订阅任意机场 → 节点会自动按 HK/TW/SG/JP/US/亚洲/欧洲/美洲/其他 归类
//
// 🔗 参考脚本：
// https://raw.githubusercontent.com/AIsouler/MyClash/main/Script/mihomoScript.js
// 原始 YAML：clashmi.yml（本仓库）
// ============================================================

// ========== 用户可调开关 ==========
const OPTIONS = {
  OVERRIDE_GROUPS: true, // true=清空订阅策略组后重建；false=保留订阅组并追加
  OVERRIDE_RULES: true,  // true=清空订阅规则后重建；false=追加
  OVERRIDE_DNS: true,    // true=覆盖 DNS 为 clashmi.yml 方案
  OVERRIDE_TUN: true,    // true=覆盖 TUN
  OVERRIDE_SNIFFER: true,// true=覆盖嗅探
  LOG_VERBOSE: true,     // true=详细日志
};

// ========== 常量：图标前缀 ==========
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
};

// ========== 节点过滤：订阅无效节点（等价 Anchor_PR filter） ==========
// clashmi.yml: "^(?!.*(剩余流量|距离下次重置|套餐到期|去除.*线路|跳转域名|请勿连接)).*$"
const INVALID_PROXY_RE = /剩余流量|距离下次重置|套餐到期|去除.*线路|跳转域名|请勿连接/;

// ========== 区域正则（等价 Anchor_HK / TW / SG / JP / US / AS / EU / AM / OT） ==========
// 简化写法：clashmi.yml 用 "^(?i)(?=.*(A|B|C)).*$" 表示"包含任意关键词"，JS 用 /A|B|C/i 即可
const RE = {
  HK: /(香港|🇭🇰|\bHK\b|\bHKG\b|Hong)/i,
  TW: /(台湾|台灣|🇹🇼|\bTW\b|Taiwan)/i,
  SG: /(新加坡|🇸🇬|\bSG\b|\bSGP\b|Singapore)/i,
  JP: /(日本|🇯🇵|\bJP\b|\bJPN\b|Japan)/i,
  US: /(美国|美國|🇺🇸|\bUS\b|\bUSA\b|America|United States)/i,
  // 亚洲：含港台新日韩印泰马菲越印尼
  AS: /(香港|台湾|台灣|新加坡|日本|韩国|韓國|印度|泰国|泰國|马来西亚|馬來西亞|菲律宾|菲律賓|越南|印尼|印度尼西亚|🇭🇰|🇹🇼|🇸🇬|🇯🇵|🇰🇷|🇮🇳|🇹🇭|🇲🇾|🇵🇭|🇻🇳|🇮🇩|\bHK\b|\bHKG\b|\bTW\b|\bSG\b|\bSGP\b|\bJP\b|\bJPN\b|\bKR\b|\bKOR\b|\bIN\b|\bTH\b|\bMY\b|\bPH\b|\bVN\b|\bID\b|Hong|Taiwan|Singapore|Japan|Korea|India|Thailand|Malaysia|Philippines|Vietnam|Indonesia)/i,
  // 欧洲：含德英法荷瑞意西芬瑞典挪威丹麦比利时奥地利波兰罗马尼亚捷克葡萄牙希腊匈牙利爱尔兰俄土
  EU: /(德国|德國|英国|英國|法国|法國|荷兰|荷蘭|瑞士|意大利|義大利|西班牙|芬兰|芬蘭|瑞典|挪威|丹麦|比利时|奥地利|波兰|罗马尼亚|羅馬尼亞|捷克|葡萄牙|希腊|匈牙利|爱尔兰|俄罗斯|俄羅斯|土耳其|🇩🇪|🇬🇧|🇫🇷|🇳🇱|🇨🇭|🇮🇹|🇪🇸|🇫🇮|🇸🇪|🇳🇴|🇩🇰|🇧🇪|🇦🇹|🇵🇱|🇷🇴|🇨🇿|🇵🇹|🇬🇷|🇭🇺|🇮🇪|🇷🇺|🇹🇷|\bDE\b|\bUK\b|\bGB\b|\bFR\b|\bNL\b|\bCH\b|\bIT\b|\bES\b|\bFI\b|\bSE\b|\bNO\b|\bDK\b|\bBE\b|\bAT\b|\bPL\b|\bRO\b|\bCZ\b|\bPT\b|\bGR\b|\bHU\b|\bIE\b|\bRU\b|\bTR\b|Germany|Britain|France|Netherlands|Switzerland|Italy|Spain|Finland|Sweden|Norway|Denmark|Belgium|Austria|Poland|Romania|Czech|Portugal|Greece|Hungary|Ireland|Russia|Turkey)/i,
  // 美洲：含美加墨巴西阿根廷智利
  AM: /(美国|美國|加拿大|墨西哥|巴西|阿根廷|智利|🇺🇸|🇨🇦|🇲🇽|🇧🇷|🇦🇷|🇨🇱|\bUS\b|\bUSA\b|\bCA\b|\bMX\b|\bBR\b|\bAR\b|\bCL\b|America|United States|Canada|Mexico|Brazil|Argentina|Chile)/i,
};
// 其他地区：排除 亚洲/欧洲/美洲 关键词（等价 Anchor_OT 的负向前瞻）
const ALL_REGION_KEYWORDS_RE = new RegExp(
  [RE.AS.source, RE.EU.source, RE.AM.source].join("|"),
  "i"
);
function isOtherRegion(name) {
  return !ALL_REGION_KEYWORDS_RE.test(name);
}

// ========== 策略组公共模板（等价 Anchor_LB / Anchor_UT / Anchor_HS） ==========
const LB_BASE = {
  type: "load-balance",
  strategy: "consistent-hashing",
  url: "https://www.g.cn/generate_204",
  interval: 300,
  lazy: false,
  timeout: 3000,
  "max-failed-times": 5,
  hidden: true,
};
const UT_BASE = {
  type: "url-test",
  url: "https://www.g.cn/generate_204",
  interval: 300,
  lazy: true,
  tolerance: 100,
  timeout: 2000,
  "max-failed-times": 3,
  hidden: true,
};

// ========== 出站列表（等价 Anchor_PG / Anchor_OP / Anchor_LD） ==========
const PROXIES_PG = [
  "香港负载均衡", "台湾负载均衡", "新加坡负载均衡", "日本负载均衡", "美国负载均衡",
  "香港速度优先", "台湾速度优先", "新加坡速度优先", "日本速度优先", "美国速度优先",
  "亚洲手动", "欧洲手动", "美洲手动", "其他手动",
];
const PROXIES_OP = [
  "一键代理", "手动选择", "国内直连",
  "香港负载均衡", "台湾负载均衡", "新加坡负载均衡", "日本负载均衡", "美国负载均衡",
  "香港速度优先", "台湾速度优先", "新加坡速度优先", "日本速度优先", "美国速度优先",
  "亚洲手动", "欧洲手动", "美洲手动", "其他手动",
];
const PROXIES_LD = [
  "国内直连", "一键代理", "手动选择",
  "香港负载均衡", "台湾负载均衡", "新加坡负载均衡", "日本负载均衡", "美国负载均衡",
];

// ========== 完整的策略组定义（顺序与 clashmi.yml 完全一致） ==========
function buildProxyGroups(allProxyNames) {
  const filterBy = (re) => allProxyNames.filter((n) => re.test(n));
  const filterOther = () => allProxyNames.filter((n) => isOtherRegion(n));

  // 辅助：创建需要过滤节点的组（LB / UT / 手动）
  // 空节点组返回 ["DIRECT"] 兜底，避免 FLClash 出现空 proxies 导致 _Map 转换或 mihomo 校验失败
  const ensureProxies = (list) => (list.length > 0 ? list : ["DIRECT"]);
  const lb = (name, re, icon) => ({
    name,
    ...LB_BASE,
    proxies: ensureProxies(filterBy(re)),
    icon,
  });
  const ut = (name, re, icon) => ({
    name,
    ...UT_BASE,
    proxies: ensureProxies(filterBy(re)),
    icon,
  });
  const manual = (name, reOrFn, icon) => ({
    name,
    type: "select",
    proxies: ensureProxies(typeof reOrFn === "function" ? reOrFn() : filterBy(reOrFn)),
    icon,
  });

  return [
    // 核心出站（3）
    { name: "一键代理", type: "select", proxies: PROXIES_PG, icon: ICON.Rocket },
    { name: "手动选择", type: "select", proxies: ["亚洲手动", "欧洲手动", "美洲手动", "其他手动"], icon: ICON.Rocket },
    { name: "国内直连", type: "select", proxies: ["DIRECT"], icon: ICON.China, hidden: true },

    // 常用地区组（10，hidden，通过一键代理访问）
    lb("香港负载均衡", RE.HK, ICON.HK),
    ut("香港速度优先", RE.HK, ICON.HK),
    lb("台湾负载均衡", RE.TW, ICON.TW),
    ut("台湾速度优先", RE.TW, ICON.TW),
    lb("新加坡负载均衡", RE.SG, ICON.SG),
    ut("新加坡速度优先", RE.SG, ICON.SG),
    lb("日本负载均衡", RE.JP, ICON.JP),
    ut("日本速度优先", RE.JP, ICON.JP),
    lb("美国负载均衡", RE.US, ICON.US),
    ut("美国速度优先", RE.US, ICON.US),

    // AI 服务（13 选项，等价 Anchor_OP）
    { name: "ChatGPT", type: "select", proxies: PROXIES_OP, icon: ICON.ChatGPT },
    { name: "Claude", type: "select", proxies: PROXIES_OP, icon: ICON.Claude },
    { name: "Gemini", type: "select", proxies: PROXIES_OP, icon: ICON.Gemini },

    // 场景服务（13 选项）
    { name: "流媒体", type: "select", proxies: PROXIES_OP, icon: ICON.Netflix },
    { name: "通信", type: "select", proxies: PROXIES_OP, icon: ICON.Telegram },
    { name: "云服务", type: "select", proxies: PROXIES_OP, icon: ICON.GitHub },
    { name: "金融", type: "select", proxies: PROXIES_OP, icon: ICON.PayPal },

    // 直连优先服务（8 选项，等价 Anchor_LD）
    { name: "Microsoft", type: "select", proxies: PROXIES_LD, icon: ICON.Microsoft },
    { name: "OneDrive", type: "select", proxies: PROXIES_LD, icon: ICON.OneDrive },
    { name: "Apple", type: "select", proxies: PROXIES_LD, icon: ICON.Apple },

    // 兜底（13 选项）
    { name: "漏网之鱼", type: "select", proxies: PROXIES_OP, icon: ICON.MATCH },

    // 大洲手动组（放在最后，不影响高频场景）
    manual("亚洲手动", RE.AS, ICON.AS),
    manual("欧洲手动", RE.EU, ICON.EU),
    manual("美洲手动", RE.AM, ICON.AM),
    manual("其他手动", filterOther, ICON.OT),
  ];
}

// ========== 规则 & 规则集（与 clashmi.yml 完全一致） ==========
const RULES = [
  // 第一优先级：内网/私有
  "RULE-SET,private_ip,国内直连,no-resolve",
  "RULE-SET,private_domain,国内直连",
  "RULE-SET,ntp_domain,国内直连",

  // 第二优先级：自定义本地规则
  "RULE-SET,my_proxy,一键代理",
  "RULE-SET,my_direct,国内直连",

  // 第三优先级：AI
  "RULE-SET,openai_domain,ChatGPT",
  "RULE-SET,anthropic_domain,Claude",
  "RULE-SET,google-gemini_domain,Gemini",

  // 第四优先级：流媒体
  "RULE-SET,youtube_domain,流媒体",
  "RULE-SET,netflix_domain,流媒体",
  "RULE-SET,netflix_ip,流媒体,no-resolve",
  "RULE-SET,tiktok_domain,流媒体",
  "RULE-SET,disney_domain,流媒体",
  "RULE-SET,spotify_domain,流媒体",
  "RULE-SET,appletv_domain,流媒体",

  // 第五优先级：通信
  "RULE-SET,telegram_domain,通信",
  "RULE-SET,telegram_ip,通信,no-resolve",
  "RULE-SET,twitter_domain,通信",
  "RULE-SET,twitter_ip,通信,no-resolve",

  // 第六优先级：云服务
  "RULE-SET,google_domain,云服务",
  "RULE-SET,google_ip,云服务,no-resolve",
  "RULE-SET,github_domain,云服务",
  "RULE-SET,speedtest_domain,云服务",

  // 第七优先级：金融
  "RULE-SET,paypal_domain,金融",

  // 第八优先级：Apple
  "RULE-SET,apple_domain,Apple",
  "RULE-SET,apple_ip,Apple,no-resolve",

  // 第九优先级：Microsoft
  "RULE-SET,onedrive_domain,OneDrive",
  "RULE-SET,microsoft_domain,Microsoft",

  // 第十优先级：国内直连
  "RULE-SET,ResourceSite,国内直连",
  "RULE-SET,PanVod,国内直连",
  "RULE-SET,add_direct_domain,国内直连",
  "RULE-SET,cn_domain,国内直连",
  "RULE-SET,cn_ip,国内直连,no-resolve",

  // 兜底
  "MATCH,漏网之鱼",
];

const RULE_PROVIDERS = {
  // 域名规则
  ResourceSite: { type: "http", interval: 86400, behavior: "classical", format: "text", timeout: 15, url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/eulac-dev/Proxy/refs/heads/main/Shadowrocket/Rules/ResourceSite.list" },
  PanVod: { type: "http", interval: 86400, behavior: "classical", format: "text", timeout: 15, url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/eulac-dev/Proxy/refs/heads/main/Shadowrocket/Rules/PanVod.list" },
  ntp_domain: { type: "http", interval: 86400, behavior: "domain", format: "mrs", timeout: 15, url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/category-ntp.mrs" },
  private_domain: { type: "http", interval: 86400, behavior: "domain", format: "mrs", timeout: 15, url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/private.mrs" },
  speedtest_domain: { type: "http", interval: 86400, behavior: "domain", format: "mrs", timeout: 15, url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/ookla-speedtest.mrs" },

  // AI
  openai_domain: { type: "http", interval: 86400, behavior: "domain", format: "mrs", timeout: 15, url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/openai.mrs" },
  anthropic_domain: { type: "http", interval: 86400, behavior: "domain", format: "mrs", timeout: 15, url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/anthropic.mrs" },
  "google-gemini_domain": { type: "http", interval: 86400, behavior: "domain", format: "mrs", timeout: 15, url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/google-gemini.mrs" },

  // 常规海外服务
  github_domain: { type: "http", interval: 86400, behavior: "domain", format: "mrs", timeout: 15, url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/github.mrs" },
  youtube_domain: { type: "http", interval: 86400, behavior: "domain", format: "mrs", timeout: 15, url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/youtube.mrs" },
  google_domain: { type: "http", interval: 86400, behavior: "domain", format: "mrs", timeout: 15, url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/google.mrs" },
  onedrive_domain: { type: "http", interval: 86400, behavior: "domain", format: "mrs", timeout: 15, url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/onedrive.mrs" },
  microsoft_domain: { type: "http", interval: 86400, behavior: "domain", format: "mrs", timeout: 15, url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/microsoft.mrs" },
  appletv_domain: { type: "http", interval: 86400, behavior: "domain", format: "mrs", timeout: 15, url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/apple-tvplus.mrs" },
  apple_domain: { type: "http", interval: 86400, behavior: "domain", format: "mrs", timeout: 15, url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/apple.mrs" },
  tiktok_domain: { type: "http", interval: 86400, behavior: "domain", format: "mrs", timeout: 15, url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/tiktok.mrs" },
  twitter_domain: { type: "http", interval: 86400, behavior: "domain", format: "mrs", timeout: 15, url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/twitter.mrs" },
  telegram_domain: { type: "http", interval: 86400, behavior: "domain", format: "mrs", timeout: 15, url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/telegram.mrs" },
  netflix_domain: { type: "http", interval: 86400, behavior: "domain", format: "mrs", timeout: 15, url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/netflix.mrs" },
  disney_domain: { type: "http", interval: 86400, behavior: "domain", format: "mrs", timeout: 15, url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/disney.mrs" },
  spotify_domain: { type: "http", interval: 86400, behavior: "domain", format: "mrs", timeout: 15, url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/spotify.mrs" },
  paypal_domain: { type: "http", interval: 86400, behavior: "domain", format: "mrs", timeout: 15, url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/paypal.mrs" },
  "geolocation-!cn": { type: "http", interval: 86400, behavior: "domain", format: "mrs", timeout: 15, url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/geolocation-!cn.mrs" },

  // 国内
  cn_domain: { type: "http", interval: 86400, behavior: "domain", format: "mrs", timeout: 15, url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/cn.mrs" },
  add_direct_domain: { type: "http", interval: 86400, behavior: "domain", format: "mrs", timeout: 15, url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/Seven1echo/Yaml/refs/heads/main/rules/Seven1_Direct_Domain.mrs" },

  // 自定义本地规则（对应 rules/my_direct.list & my_proxy.list）
  my_direct: { type: "http", interval: 86400, behavior: "classical", format: "text", timeout: 15, url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/cgoder/clash_rules/main/rules/my_direct.list" },
  my_proxy: { type: "http", interval: 86400, behavior: "classical", format: "text", timeout: 15, url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/cgoder/clash_rules/main/rules/my_proxy.list" },

  // IP 规则
  apple_ip: { type: "http", interval: 86400, behavior: "ipcidr", format: "mrs", timeout: 15, url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo-lite/geoip/apple.mrs" },
  private_ip: { type: "http", interval: 86400, behavior: "ipcidr", format: "mrs", timeout: 15, url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geoip/private.mrs" },
  google_ip: { type: "http", interval: 86400, behavior: "ipcidr", format: "mrs", timeout: 15, url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geoip/google.mrs" },
  telegram_ip: { type: "http", interval: 86400, behavior: "ipcidr", format: "mrs", timeout: 15, url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geoip/telegram.mrs" },
  twitter_ip: { type: "http", interval: 86400, behavior: "ipcidr", format: "mrs", timeout: 15, url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geoip/twitter.mrs" },
  netflix_ip: { type: "http", interval: 86400, behavior: "ipcidr", format: "mrs", timeout: 15, url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geoip/netflix.mrs" },
  cn_ip: { type: "http", interval: 86400, behavior: "ipcidr", format: "mrs", timeout: 15, url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geoip/cn.mrs" },
};

// ========== 核心配置（与 clashmi.yml 完全一致） ==========
const CORE_CONFIG = {
  "mixed-port": 7893,
  mode: "rule",
  "allow-lan": true,
  "bind-address": "*",
  "tcp-concurrent": true,
  "unified-delay": true,
  "log-level": "warning",
  ipv6: false,
  profile: { "store-selected": true, "store-fake-ip": true },
  "external-ui-name": "zashboard",
  "external-ui": "ui",
  "external-controller": "127.0.0.1:9090",
  secret: "",
  "external-ui-url": "https://v4.gh-proxy.org/https://github.com/Zephyruso/zashboard/releases/latest/download/dist-no-fonts.zip",
  tun: {
    enable: true,
    stack: "mixed",
    // FLClash 仅识别以下字段，额外 mihomo 字段保留但需与模型兼容
    "dns-hijack": ["any:53", "tcp://any:53"],
    "auto-route": true,
    "auto-redirect": true,
    "auto-detect-interface": true,
    "strict-route": true,
    "endpoint-independent-nat": true,
    // mihomo 扩展字段（FLClash 会原样写入 YAML，mihomo 可识别）
    mtu: 1300,
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
  },
  sniffer: {
    enable: true,
    "override-destination": true,
    "parse-pure-ip": true,
    "force-dns-mapping": true,
    sniff: {
      QUIC: { ports: [443, 8443] },
      TLS: { ports: [443, 8443] },
      HTTP: { ports: [80, 8080, 8880], "override-destination": true },
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
  },
  dns: {
    enable: true,
    ipv6: false,
    listen: "0.0.0.0:7874",
    // 注意：FLClash 的 Dns 模型没有 cache / fake-ip-filter-mode 字段，移除以避免 Map<String,String> 转换错误
    "enhanced-mode": "fake-ip",
    "prefer-h3": false,
    "fake-ip-range": "198.18.0.1/16",
    "fake-ip-filter": [
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
    "use-hosts": false,
    "use-system-hosts": false,
    "default-nameserver": ["223.5.5.5", "119.29.29.29"],
    "proxy-server-nameserver": ["223.5.5.5", "119.29.29.29"],
    nameserver: ["https://doh.pub/dns-query", "https://dns.alidns.com/dns-query"],
    "nameserver-policy": {
      // FLClash 的 Dns.nameserverPolicy 是 Map<String,String>，值必须是 String（不能是 List）
      // mihomo 原生支持 List，但为兼容 FLClash 这里用逗号分隔的 String
      "rule-set:geolocation-!cn": "https://1.1.1.1/dns-query#一键代理, https://8.8.8.8/dns-query#一键代理",
      "rule-set:my_proxy": "https://1.1.1.1/dns-query#一键代理, https://8.8.8.8/dns-query#一键代理",
      "+.orb.local": "system",
    },
  },
};

// ========== 主函数（FLClash 入口） ==========
function main(config) {
  const log = (...args) => OPTIONS.LOG_VERBOSE && console.log(...args);

  log("🚀 clashmi_flclash.js 开始执行 | 基于 clashmi.yml");
  config.proxies ??= [];
  config["proxy-groups"] ??= [];
  config.rules ??= [];
  config["rule-providers"] ??= {};

  // 0. 过滤无效节点（等价 proxy-provider 的 filter）
  const beforeCount = config.proxies.length;
  const validProxies = config.proxies.filter((p) => {
    const name = typeof p === "string" ? p : p.name;
    return !INVALID_PROXY_RE.test(name);
  });
  const filteredCount = beforeCount - validProxies.length;
  if (filteredCount > 0) log(`🧹 已过滤 ${filteredCount} 个无效节点（剩余流量/套餐到期等）`);
  config.proxies = validProxies;

  // 去重（保留首个同名节点），参考 mihomoScript.js 的逻辑
  const seen = new Set();
  const deduped = [];
  let dupCount = 0;
  for (const p of config.proxies) {
    const name = p.name;
    if (!seen.has(name)) {
      seen.add(name);
      deduped.push(p);
    } else {
      dupCount++;
    }
  }
  if (dupCount > 0) log(`🧹 去重 ${dupCount} 个同名节点`);
  config.proxies = deduped;

  const allProxyNames = config.proxies.map((p) => p.name);
  log(`📦 有效节点数: ${allProxyNames.length}（原始 ${beforeCount}）`);
  log(`📋 订阅策略组数: ${config["proxy-groups"].length}`);
  log(`📜 订阅规则数: ${config.rules.length}`);

  // 1. 覆盖核心配置（按 FLClash 的 PatchClashConfig/Dns/Tun 模型做兼容处理）
  for (const [k, v] of Object.entries(CORE_CONFIG)) {
    const shouldOverride =
      (k === "dns" && OPTIONS.OVERRIDE_DNS) ||
      (k === "tun" && OPTIONS.OVERRIDE_TUN) ||
      (k === "sniffer" && OPTIONS.OVERRIDE_SNIFFER) ||
      !["dns", "tun", "sniffer"].includes(k);
    if (shouldOverride) {
      config[k] = JSON.parse(JSON.stringify(v)); // 深拷贝，避免引用污染
    }
  }
  // 兼容性修正：FLClash 的 Dns.nameserverPolicy 是 Map<String,String>，旧脚本写成了 Map<String,List<String>>
  // 已在 CORE_CONFIG 中改为 String，这里再做一次运行时兜底（防止订阅自带 dns 污染）
  if (config.dns && config.dns["nameserver-policy"]) {
    for (const [kk, vv] of Object.entries(config.dns["nameserver-policy"])) {
      if (Array.isArray(vv)) {
        config.dns["nameserver-policy"][kk] = vv.join(", ");
      }
    }
  }
  // 清理 FLClash 不识别的字段，避免 Dart 端 as Map<String,dynamic> 强转失败
  if (config.dns) {
    delete config.dns.cache;
    delete config.dns["fake-ip-filter-mode"];
  }
  // 额外确保 DNS 的 orb.local 直连（FLClash 本地容器需要）
  if (config.dns) {
    config.dns["fake-ip-filter"] ??= [];
    if (!config.dns["fake-ip-filter"].includes("+.orb.local")) {
      config.dns["fake-ip-filter"].push("+.orb.local");
    }
    config.dns["nameserver-policy"] ??= {};
    config.dns["nameserver-policy"]["+.orb.local"] = "system";
  }
  // 清理可能残留的 proxy-providers（FLClash 已解析为 proxies，不再需要）
  if (config["proxy-providers"]) {
    log(`🗑️ 清理 ${Object.keys(config["proxy-providers"]).length} 个 proxy-providers（已转为 proxies）`);
    delete config["proxy-providers"];
  }

  // 2. 构建策略组（BettBox/mihomo 对空 proxies 会直接抛 `use or proxies missing`，需过滤）
  let newGroups = buildProxyGroups(allProxyNames);
  // 兜底：若某过滤组仍为空（ensureProxies 已给 DIRECT，但为避免 BettBox 的 DAG 校验仍报错，做二次过滤）
  // 策略：若组内只有 DIRECT 且原过滤结果为空，则视为“无可用节点”，从配置中移除，并清理其它组对它的引用
  const emptyGroups = new Set();
  for (const g of newGroups) {
    // 仅检查按正则过滤的 14 个地域组
    const isRegional = ["香港负载均衡", "台湾负载均衡", "新加坡负载均衡", "日本负载均衡", "美国负载均衡",
      "香港速度优先", "台湾速度优先", "新加坡速度优先", "日本速度优先", "美国速度优先",
      "亚洲手动", "欧洲手动", "美洲手动", "其他手动"].includes(g.name);
    if (isRegional && g.proxies.length === 1 && g.proxies[0] === "DIRECT") {
      // 说明原始过滤结果为 0，被 ensureProxies 强行填了 DIRECT，视为无效组
      emptyGroups.add(g.name);
    }
  }
  if (emptyGroups.size > 0) {
    log(`⚠️  检测到 ${emptyGroups.size} 个空地域组（无匹配节点）：${[...emptyGroups].join("、" )}，将自动剔除并清理引用`);
    newGroups = newGroups.filter(g => !emptyGroups.has(g.name));
    // 清理其它组对空组的引用，避免悬空策略组
    for (const g of newGroups) {
      if (Array.isArray(g.proxies)) {
        const before = g.proxies.length;
        g.proxies = g.proxies.filter(p => !emptyGroups.has(p));
        if (g.proxies.length === 0) g.proxies = ["DIRECT"]; // 兜底，避免自身变空
        if (g.proxies.length !== before) log(`  ↳ 已从 [${g.name}] 移除空引用：${[...emptyGroups].filter(x => !g.proxies.includes(x)).join("、")}`);
      }
    }
  }

  // 日志：统计每个过滤组匹配数
  for (const g of newGroups) {
    if (g.proxies && Array.isArray(g.proxies) && (g.type === "load-balance" || g.type === "url-test" || g.name.endsWith("手动"))) {
      // 过滤组：proxies 是节点名列表
      const isFilteredGroup = ["香港负载均衡", "台湾负载均衡", "新加坡负载均衡", "日本负载均衡", "美国负载均衡",
        "香港速度优先", "台湾速度优先", "新加坡速度优先", "日本速度优先", "美国速度优先",
        "亚洲手动", "欧洲手动", "美洲手动", "其他手动"].includes(g.name);
      if (isFilteredGroup) {
        log(`  ${g.proxies.length === 0 ? "⚠️" : "✅"} ${g.name}: ${g.proxies.length} 节点${g.proxies.length === 0 ? "（无匹配）" : ""}`);
      }
    }
  }

  if (OPTIONS.OVERRIDE_GROUPS) {
    const oldCount = config["proxy-groups"].length;
    config["proxy-groups"] = newGroups;
    log(`🔥 覆写策略组: ${oldCount} → ${newGroups.length}`);
  } else {
    // 追加模式：避免重名
    const existingNames = new Set(config["proxy-groups"].map((g) => g.name));
    let added = 0;
    for (const g of newGroups) {
      if (!existingNames.has(g.name)) {
        config["proxy-groups"].push(g);
        added++;
      }
    }
    log(`➕ 追加策略组: +${added}（去重后 ${config["proxy-groups"].length}）`);
  }

  // 校验：策略组引用的 proxies 是否存在（提前发现配置错误）
  const allGroupNames = new Set(config["proxy-groups"].map((g) => g.name));
  allGroupNames.add("DIRECT");
  allGroupNames.add("REJECT");
  allGroupNames.add("REJECT-DROP");
  allGroupNames.add("PASS");
  for (const g of config["proxy-groups"]) {
    if (!g.proxies || !Array.isArray(g.proxies)) continue;
    // 跳过过滤组（其 proxies 是节点名，已校验）
    const isRefGroup = ["一键代理", "手动选择", "国内直连", "ChatGPT", "Claude", "Gemini", "流媒体", "通信", "云服务", "金融", "Microsoft", "OneDrive", "Apple", "漏网之鱼"].includes(g.name);
    if (!isRefGroup) continue;
    const missing = g.proxies.filter((p) => !allGroupNames.has(p) && !allProxyNames.includes(p));
    if (missing.length > 0 && OPTIONS.LOG_VERBOSE) {
      log(`  ⚠️ ${g.name} 引用了不存在的代理/策略组: ${missing.join(", ")}`);
    }
  }

  // 3. 构建规则 & 规则集
  if (OPTIONS.OVERRIDE_RULES) {
    const oldRules = config.rules.length;
    const oldProviders = Object.keys(config["rule-providers"]).length;
    config.rules = [...RULES];
    config["rule-providers"] = JSON.parse(JSON.stringify(RULE_PROVIDERS));
    log(`🔥 覆写规则: ${oldRules} → ${RULES.length} 条`);
    log(`🔥 覆写 rule-providers: ${oldProviders} → ${Object.keys(RULE_PROVIDERS).length} 个`);
  } else {
    // 追加模式
    let addedRules = 0;
    const upperExisting = new Set(config.rules.map((r) => r.toUpperCase().trim()));
    for (const r of RULES) {
      if (!upperExisting.has(r.toUpperCase().trim())) {
        // 插入到 MATCH 之前
        const idx = config.rules.findIndex((x) => x.toUpperCase().startsWith("MATCH"));
        if (idx === -1) config.rules.push(r);
        else config.rules.splice(idx, 0, r);
        addedRules++;
      }
    }
    Object.assign(config["rule-providers"], RULE_PROVIDERS);
    log(`➕ 追加规则: +${addedRules} 条（共 ${config.rules.length}）`);
  }

  log(`📊 最终: ${config.proxies.length} 节点 | ${config["proxy-groups"].length} 策略组 | ${config.rules.length} 规则 | ${Object.keys(config["rule-providers"]).length} 规则集`);
  log("🎉 clashmi_flclash.js 执行完成\n");

  return config;
}
