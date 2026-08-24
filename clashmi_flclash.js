// ============================================================
// 🔧 clashmi.yml → BettBox JS Override  v2.0  (基于 mihomoScript.js 重构)
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
};

// 无效节点正则（等价 Anchor_PR filter + mihomoScript.js 的 excludeFilter）
const INVALID_PROXY_RE = /剩余流量|距离下次重置|套餐到期|去除.*线路|跳转域名|请勿连接/;
const excludeFilter = /群|返利|循环|官网|客服|网站|网址|获取|订阅|流量|到期|机场|下次|版本|官址|备用|过期|已用|联系|邮箱|工单|贩卖|通知|倒卖|防止|国内|地址|频道|电报|无法|说明|使用|提示|访问|支持|教程|关注|更新|作者|加入|超时|收藏|优惠|福利|邀请|好友|失联|选择|剩余|公益|发布|DIZTNA|通路|登录|禁止|定时|渠道|牢记|永久|余额|阁下|本站|刷新|导航|建议|重置|以下|⚠️|@|t\.me\/\+|\bexpire\b|\bhttps?:\/\/|\.com|\btraffic\b/iu;

// 区域正则（与 clashmi.yml Anchor_HK/TW/SG/JP/US/AS/EU/AM/OT 1:1）
const RE = {
  HK: /(香港|🇭🇰|\bHK\b|\bHKG\b|Hong)/i,
  TW: /(台湾|台灣|🇹🇼|\bTW\b|Taiwan)/i,
  SG: /(新加坡|🇸🇬|\bSG\b|\bSGP\b|Singapore)/i,
  JP: /(日本|🇯🇵|\bJP\b|\bJPN\b|Japan)/i,
  US: /(美国|美國|🇺🇸|\bUS\b|\bUSA\b|America|United States)/i,
  AS: /(香港|台湾|台灣|新加坡|日本|韩国|韓國|印度|泰国|泰國|马来西亚|馬來西亞|菲律宾|菲律賓|越南|印尼|印度尼西亚|🇭🇰|🇹🇼|🇸🇬|🇯🇵|🇰🇷|🇮🇳|🇹🇭|🇲🇾|🇵🇭|🇻🇳|🇮🇩|\bHK\b|\bHKG\b|\bTW\b|\bSG\b|\bSGP\b|\bJP\b|\bJPN\b|\bKR\b|\bKOR\b|\bIN\b|\bTH\b|\bMY\b|\bPH\b|\bVN\b|\bID\b|Hong|Taiwan|Singapore|Japan|Korea|India|Thailand|Malaysia|Philippines|Vietnam|Indonesia)/i,
  EU: /(德国|德國|英国|英國|法国|法國|荷兰|荷蘭|瑞士|意大利|義大利|西班牙|芬兰|芬蘭|瑞典|挪威|丹麦|比利时|奥地利|波兰|罗马尼亚|羅馬尼亞|捷克|葡萄牙|希腊|匈牙利|爱尔兰|俄罗斯|俄羅斯|土耳其|🇩🇪|🇬🇧|🇫🇷|🇳🇱|🇨🇭|🇮🇹|🇪🇸|🇫🇮|🇸🇪|🇳🇴|🇩🇰|🇧🇪|🇦🇹|🇵🇱|🇷🇴|🇨🇿|🇵🇹|🇬🇷|🇭🇺|🇮🇪|🇷🇺|🇹🇷|\bDE\b|\bUK\b|\bGB\b|\bFR\b|\bNL\b|\bCH\b|\bIT\b|\bES\b|\bFI\b|\bSE\b|\bNO\b|\bDK\b|\bBE\b|\bAT\b|\bPL\b|\bRO\b|\bCZ\b|\bPT\b|\bGR\b|\bHU\b|\bIE\b|\bRU\b|\bTR\b|Germany|Britain|France|Netherlands|Switzerland|Italy|Spain|Finland|Sweden|Norway|Denmark|Belgium|Austria|Poland|Romania|Czech|Portugal|Greece|Hungary|Ireland|Russia|Turkey)/i,
  AM: /(美国|美國|加拿大|墨西哥|巴西|阿根廷|智利|🇺🇸|🇨🇦|🇲🇽|🇧🇷|🇦🇷|🇨🇱|\bUS\b|\bUSA\b|\bCA\b|\bMX\b|\bBR\b|\bAR\b|\bCL\b|America|United States|Canada|Mexico|Brazil|Argentina|Chile)/i,
};
const ALL_REGION_KEYWORDS_RE = new RegExp([RE.AS.source, RE.EU.source, RE.AM.source].join("|"), "i");
function isOtherRegion(name) { return !ALL_REGION_KEYWORDS_RE.test(name); }

// 策略组模板（与 mihomoScript.js 的 groupBaseOption 语义一致）
const groupBaseOption = {
  interval: 600, timeout: 3000, url: "https://www.g.cn/generate_204",
  lazy: true, "max-failed-times": 3, "empty-fallback": "DIRECT",
};
const LB_BASE = { type: "load-balance", strategy: "consistent-hashing", ...groupBaseOption, hidden: true };
const UT_BASE = { type: "url-test", tolerance: 100, ...groupBaseOption, hidden: true };

const PROXIES_PG = ["香港负载均衡","台湾负载均衡","新加坡负载均衡","日本负载均衡","美国负载均衡","香港速度优先","台湾速度优先","新加坡速度优先","日本速度优先","美国速度优先","亚洲手动","欧洲手动","美洲手动","其他手动"];
const PROXIES_OP = ["一键代理","手动选择","国内直连","香港负载均衡","台湾负载均衡","新加坡负载均衡","日本负载均衡","美国负载均衡","香港速度优先","台湾速度优先","新加坡速度优先","日本速度优先","美国速度优先","亚洲手动","欧洲手动","美洲手动","其他手动"];
const PROXIES_LD = ["国内直连","一键代理","手动选择","香港负载均衡","台湾负载均衡","新加坡负载均衡","日本负载均衡","美国负载均衡"];

function buildProxyGroups(allProxyNames) {
  const filterBy = (re) => allProxyNames.filter((n) => re.test(n));
  const filterOther = () => allProxyNames.filter((n) => isOtherRegion(n));
  const lb = (name, re, icon) => ({ name, ...LB_BASE, proxies: filterBy(re), icon });
  const ut = (name, re, icon) => ({ name, ...UT_BASE, proxies: filterBy(re), icon });
  const manual = (name, reOrFn, icon) => ({ name, type: "select", proxies: typeof reOrFn === "function" ? reOrFn() : filterBy(reOrFn), icon });
  return [
    { name: "一键代理", type: "select", proxies: PROXIES_PG, icon: ICON.Rocket },
    { name: "手动选择", type: "select", proxies: ["亚洲手动","欧洲手动","美洲手动","其他手动"], icon: ICON.Rocket },
    { name: "国内直连", type: "select", proxies: ["DIRECT"], icon: ICON.China, hidden: true },
    lb("香港负载均衡", RE.HK, ICON.HK), ut("香港速度优先", RE.HK, ICON.HK),
    lb("台湾负载均衡", RE.TW, ICON.TW), ut("台湾速度优先", RE.TW, ICON.TW),
    lb("新加坡负载均衡", RE.SG, ICON.SG), ut("新加坡速度优先", RE.SG, ICON.SG),
    lb("日本负载均衡", RE.JP, ICON.JP), ut("日本速度优先", RE.JP, ICON.JP),
    lb("美国负载均衡", RE.US, ICON.US), ut("美国速度优先", RE.US, ICON.US),
    { name: "ChatGPT", type: "select", proxies: PROXIES_OP, icon: ICON.ChatGPT },
    { name: "Claude", type: "select", proxies: PROXIES_OP, icon: ICON.Claude },
    { name: "Gemini", type: "select", proxies: PROXIES_OP, icon: ICON.Gemini },
    { name: "流媒体", type: "select", proxies: PROXIES_OP, icon: ICON.Netflix },
    { name: "通信", type: "select", proxies: PROXIES_OP, icon: ICON.Telegram },
    { name: "云服务", type: "select", proxies: PROXIES_OP, icon: ICON.GitHub },
    { name: "金融", type: "select", proxies: PROXIES_OP, icon: ICON.PayPal },
    { name: "Microsoft", type: "select", proxies: PROXIES_LD, icon: ICON.Microsoft },
    { name: "OneDrive", type: "select", proxies: PROXIES_LD, icon: ICON.OneDrive },
    { name: "Apple", type: "select", proxies: PROXIES_LD, icon: ICON.Apple },
    { name: "漏网之鱼", type: "select", proxies: PROXIES_OP, icon: ICON.MATCH },
    manual("亚洲手动", RE.AS, ICON.AS), manual("欧洲手动", RE.EU, ICON.EU),
    manual("美洲手动", RE.AM, ICON.AM), manual("其他手动", filterOther, ICON.OT),
  ];
}

// 规则（与 clashmi.yml 1:1）
const RULES = [
  "RULE-SET,private_ip,国内直连,no-resolve","RULE-SET,private_domain,国内直连","RULE-SET,ntp_domain,国内直连",
  "RULE-SET,my_proxy,一键代理","RULE-SET,my_direct,国内直连",
  "RULE-SET,openai_domain,ChatGPT","RULE-SET,anthropic_domain,Claude","RULE-SET,google-gemini_domain,Gemini",
  "RULE-SET,youtube_domain,流媒体","RULE-SET,netflix_domain,流媒体","RULE-SET,netflix_ip,流媒体,no-resolve","RULE-SET,tiktok_domain,流媒体","RULE-SET,disney_domain,流媒体","RULE-SET,spotify_domain,流媒体","RULE-SET,appletv_domain,流媒体",
  "RULE-SET,telegram_domain,通信","RULE-SET,telegram_ip,通信,no-resolve","RULE-SET,twitter_domain,通信","RULE-SET,twitter_ip,通信,no-resolve",
  "RULE-SET,google_domain,云服务","RULE-SET,google_ip,云服务,no-resolve","RULE-SET,github_domain,云服务","RULE-SET,speedtest_domain,云服务",
  "RULE-SET,paypal_domain,金融",
  "RULE-SET,apple_domain,Apple","RULE-SET,apple_ip,Apple,no-resolve",
  "RULE-SET,onedrive_domain,OneDrive","RULE-SET,microsoft_domain,Microsoft",
  "RULE-SET,ResourceSite,国内直连","RULE-SET,PanVod,国内直连","RULE-SET,add_direct_domain,国内直连","RULE-SET,cn_domain,国内直连","RULE-SET,cn_ip,国内直连,no-resolve",
  "MATCH,漏网之鱼",
];
const RULE_PROVIDERS = {
  ResourceSite: { type: "http", interval: 86400, behavior: "classical", format: "text", url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/eulac-dev/Proxy/refs/heads/main/Shadowrocket/Rules/ResourceSite.list" },
  PanVod: { type: "http", interval: 86400, behavior: "classical", format: "text", url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/eulac-dev/Proxy/refs/heads/main/Shadowrocket/Rules/PanVod.list" },
  ntp_domain: { type: "http", interval: 86400, behavior: "domain", format: "mrs", url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/category-ntp.mrs" },
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
  "geolocation-!cn": { type: "http", interval: 86400, behavior: "domain", format: "mrs", url: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/geolocation-!cn.mrs" },
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
  // BettBox 的 Dns.nameserverPolicy 要求 Map<String,String>，值为单条 String（逗号分隔多条）
  // mihomo 原生支持 List，但为过 Dart 的 `e as String` 校验，这里统一用 String
  return {
    dns: {
      enable: true, ipv6: false, listen: "0.0.0.0:7874",
      "enhanced-mode": "fake-ip", "fake-ip-range": "198.18.0.1/16",
      "fake-ip-filter": ["+.orb.local","localhost","*.home.arpa","time.*.com","ntp.*.com","+.ntp.org","+.pool.ntp.org","captive.apple.com","connectivitycheck.gstatic.com","+.msftconnecttest.com","+.msftncsi.com","stun.*.*","+.stun.playstation.net","+.xboxlive.com","+.speedtest.net"],
      "default-nameserver": chinaDNS,
      "proxy-server-nameserver": chinaDNS,
      nameserver: foreignDNS,
      "nameserver-policy": {
        "geosite:cn": chinaDNS.join(", "),
        "rule-set:geolocation-!cn": "https://1.1.1.1/dns-query#一键代理, https://8.8.8.8/dns-query#一键代理",
        "rule-set:my_proxy": "https://1.1.1.1/dns-query#一键代理, https://8.8.8.8/dns-query#一键代理",
        "+.orb.local": "system",
      },
    },
    hosts: {
      "cloudflare-dns.com": "1.1.1.1",
      "dns.google": "8.8.8.8",
    }
  };
}

// ===== 节点过滤（复用 mihomoScript.js 的双重过滤 + 去重）=====
function filterAndNormalizeProxies(allProxies) {
  const list = (allProxies || []).filter(p => {
    const n = typeof p === "string" ? p : p.name;
    return !INVALID_PROXY_RE.test(n) && !excludeFilter.test(n);
  });
  const seen = new Set(); const out = [];
  for (const p of list) {
    const name = p.name;
    if (!seen.has(name)) { seen.add(name); out.push(p); }
  }
  if (out.length === 0) throw new Error("配置文件中未找到任何代理节点，请检查订阅");
  return out;
}

// ===== 主函数（BettBox 入口：必须返回 newConfig 全量对象，切勿直接改 config）=====
function main(config) {
  const log = (...args) => OPTIONS.LOG_VERBOSE && console.log(...args);
  log("🚀 clashmi_bettbox.js v2.0 基于 mihomoScript.js 重构");
  try {
    const filteredProxies = filterAndNormalizeProxies(config.proxies);
    const allProxyNames = filteredProxies.map(p => p.name);
    log(`📦 有效节点 ${allProxyNames.length}/${(config.proxies||[]).length}`);

    // 1. 构建策略组并剔除空地域组（解决 Go: use or proxies missing）
    let proxyGroups = buildProxyGroups(allProxyNames);
    const regional = ["香港负载均衡","台湾负载均衡","新加坡负载均衡","日本负载均衡","美国负载均衡","香港速度优先","台湾速度优先","新加坡速度优先","日本速度优先","美国速度优先","亚洲手动","欧洲手动","美洲手动","其他手动"];
    const empty = new Set(proxyGroups.filter(g => regional.includes(g.name) && (!g.proxies || g.proxies.length===0)).map(g=>g.name));
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
    newConfig["profile"] = { "store-selected": true, "store-fake-ip": true };
    if (OPTIONS.OVERRIDE_TUN) newConfig["tun"] = { enable: true, stack: "system", "auto-route": true, "strict-route": true, "auto-redirect": true, "auto-detect-interface": true, "dns-hijack": ["any:53","tcp://any:53"] };
    // sniffer 按需：BettBox 默认 sniffer 已可，此处不覆写避免 _Map 错误；如需可打开
    // if (OPTIONS.OVERRIDE_SNIFFER) newConfig["sniffer"] = { enable: true, ... };
    newConfig["proxies"] = filteredProxies;
    newConfig["proxy-groups"] = proxyGroups;
    newConfig["rule-providers"] = OPTIONS.OVERRIDE_RULES ? RULE_PROVIDERS : { ...(config["rule-providers"]||{}), ...RULE_PROVIDERS };
    newConfig["rules"] = OPTIONS.OVERRIDE_RULES ? [...RULES] : [...RULES, ...(config.rules||[])];
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
