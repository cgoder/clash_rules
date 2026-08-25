// ============================================================
// 🔧 clashmi → FlClash/BettBox 覆写 v4.0
// ⏰ 更新时间: 2026-08-25 11:26:01 CST
// 基于 clashmi.yml 1:1 + 例份最佳实践重构（BettBox 兼容）
// - 吸收：normalizeName/buildRegex/uniq/makeProxyNamesUnique/splitInfo/classify/Info组/AI排除HK/工厂模式/Fallback双组/applyDns合并
// - 保留：25+ 策略组（10×LB/UT + 4×大洲手动）、33 rule-providers、32 rules、gh-proxy 加速、图标体系
// 使用：FlClash/BettBox → 配置 → 覆写 → 脚本模式 → 粘贴 → 保存
// 参照：mihomoScript.js + 例份 profile
// ============================================================

function main(config) {
  // ==================== 0. 直连域名（按需增） ====================
  const bypassDomains = ["example.com", "none.com"];

  // ==================== 1. 常量 ====================
  const SETTINGS = {
    ICON_BASE: "https://v4.gh-proxy.org/https://github.com/cgoder/clash_rules/raw/main/icons/",
    RULE_BASE: "https://v4.gh-proxy.org/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/",
    TEST_URL: "https://www.g.cn/generate_204",
    REGION_ORDER: ["HK", "TW", "SG", "JP", "US", "AS", "EU", "AM", "OT"],
    // 对齐 mihomoScript.js: interval 600 / max-failed 3 / empty-fallback DIRECT / exclude-type DIRECT
    URL_TEST_EXTRA: { hidden: true, url: "https://www.g.cn/generate_204", interval: 600, tolerance: 100, lazy: false, timeout: 3000, "max-failed-times": 3, "empty-fallback": "DIRECT", "exclude-type": "DIRECT" },
    FALLBACK_EXTRA: { hidden: true, url: "https://www.g.cn/generate_204", interval: 600, tolerance: 100, lazy: false, timeout: 3000, "max-failed-times": 3, "empty-fallback": "DIRECT", "exclude-type": "DIRECT" },
    LOAD_BALANCE_EXTRA: { hidden: true, url: "https://www.g.cn/generate_204", interval: 600, tolerance: 100, lazy: false, timeout: 3000, "max-failed-times": 3, "empty-fallback": "DIRECT", "exclude-type": "DIRECT", strategy: "consistent-hashing" },
    FILTER_REGEX: /群|邀请|返利|官网|官方|网址|订阅|购买|续费|剩余|到期|过期|流量|备用|邮箱|客服|联系|工单|倒卖|防止|梯子|tg|telegram|电报|发布|重置|剩余流量|距离下次重置|套餐到期|去除.*线路|跳转域名|请勿连接/i,
    BASIC_FAKE_IP_FILTER: ["*.lan","+.lan","*.local","+.local","+.localdomain","+.home.arpa","+.msftconnecttest.com","+.msftncsi.com","+.gstatic.com","connectivitycheck.gstatic.com","+.captive.apple.com","time.*.com","time.*.gov","ntp.*.com","ntp.*.org","pool.ntp.org","+.pool.ntp.org","+.stun.*.*","+.stun.*.*.*","localhost.ptlogin2.qq.com","WORKGROUP","+.orb.local"],
    FORCE_DOMAIN: ["+.netflix.com","+.nflxvideo.net","+.googlevideo.com","+.youtube.com","+.telegram.org","+.t.me","+.twitter.com","+.twimg.com","+.tiktok.com","+.amazonaws.com"],
    DIRECT_FIX_RULES: ["DOMAIN-SUFFIX,ol.epicgames.com,DIRECT","DOMAIN-SUFFIX,sharepoint.com,DIRECT"],
  };

  // ==================== 2. 工具 ====================
  const uniq = (arr=[]) => [...new Set(arr.filter(Boolean))];
  const escapeRegex = (s="") => String(s).replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
  const normalizeName = (name="") => String(name).replace(/(IEPL|IPLC|BGP|RELAY|PRO|V\d+)/ig," $1 ").replace(/[【】\[\]（）()|_\-.,/:~]/g," ").replace(/🇭🇰/g," HK ").replace(/🇹🇼/g," TW ").replace(/🇸🇬/g," SG ").replace(/🇯🇵/g," JP ").replace(/🇰🇷/g," KR ").replace(/🇺🇸/g," US ").replace(/🇻🇳|🇹🇭|🇲🇾|🇮🇩|🇵🇭|🇩🇪|🇬🇧|🇫🇷|🇨🇦|🇲🇽|🇧🇷|🇦🇷|🇨🇱|🇷🇺|🇹🇷/g," ").toUpperCase().replace(/\s+/g," ").trim();
  const buildRegex = (arr=[]) => {
    const pats = arr.map(raw=>{const t=String(raw).trim().toUpperCase(); const e=escapeRegex(t); return /^[A-Z]{2,3}$/.test(t) ? `(?:^|[^A-Z])${e}(?:[^A-Z]|$)` : e;});
    return new RegExp(pats.join("|"),"i");
  };
  const buildRegions = () => ([
    { name:"HK", pattern:["香港","HK","HKG","HONGKONG","HONG KONG"], icon:"HK.png" },
    { name:"TW", pattern:["台湾","台灣","台北","新北","TW","TWN","TAIWAN","TAIPEI"], icon:"TW.png" },
    { name:"SG", pattern:["新加坡","狮城","SG","SGP","SINGAPORE","SIN"], icon:"SG.png" },
    { name:"JP", pattern:["日本","东京","大阪","JP","JPN","JAPAN","TOKYO","OSAKA"], icon:"JP.png" },
    { name:"US", pattern:["美国","美國","纽约","洛杉矶","US","USA","UNITEDSTATES","UNITED STATES"], icon:"US.png" },
    { name:"AS", pattern:["韩国","韓國","印度","泰国","泰國","马来西亚","馬來西亞","菲律宾","菲律賓","越南","印尼","KR","KOR","KOREA","IN","TH","MY","PH","VN","ID","VIETNAM","THAILAND","MALAYSIA","PHILIPPINES"], icon:"AS.png" },
    { name:"EU", pattern:["德国","德國","英国","英國","法国","法國","荷兰","荷蘭","瑞士","意大利","義大利","西班牙","芬兰","瑞典","挪威","丹麦","比利时","奥地利","波兰","捷克","葡萄牙","希腊","匈牙利","爱尔兰","俄罗斯","土耳其","DE","UK","GB","FR","NL","CH","IT","ES","FI","SE","NO","DK","BE","AT","PL","CZ","PT","GR","HU","IE","RU","TR","GERMANY","FRANCE"], icon:"EU.png" },
    { name:"AM", pattern:["加拿大","墨西哥","巴西","阿根廷","智利","CA","MX","BR","AR","CL","CANADA","MEXICO","BRAZIL"], icon:"AM.png" },
    { name:"OT", pattern:[], icon:"OT.png" }, // 兜底，其他
  ]).map(r=> ({...r, regex: r.name==="OT" ? null : buildRegex(r.pattern)}));

  const REGIONS = buildRegions();
  const ensureConfigObject = (o) => (o && typeof o==="object" ? o : {});
  const getOriginalProxies = (c) => Array.isArray(c.proxies) ? c.proxies : [];
  const makeProxyNamesUnique = (proxies=[]) => {
    const used=new Set(), next=new Map();
    proxies.forEach(p=>{
      if(!p?.name) return; const base=String(p.name);
      if(!used.has(base)){ used.add(base); next.set(base,1); return; }
      let idx=next.get(base)??1, cand=`${base}_${idx}`;
      while(used.has(cand)){ idx+=1; cand=`${base}_${idx}`; }
      p.name=cand; used.add(cand); next.set(base, idx+1);
    });
  };
  const splitInfoAndNormalProxies = (proxies=[], re) => {
    const info=[], normal=[];
    proxies.forEach(p=>{ if(!p?.name) return; (re.test(p.name)?info:normal).push(p); });
    return {infoProxies:info, normalProxies:normal};
  };
  const classifyProxiesByRegion = (normalProxies=[], regions=[]) => {
    const datas = regions.filter(r=>r.name!=="OT").map(r=>({name:r.name, icon:r.icon, regex:r.regex, proxies:[]}));
    const map=new Map(datas.map(r=>[r.name,r])), seen=new Map(datas.map(r=>[r.name,new Set()]));
    const other=[], otherSeen=new Set();
    normalProxies.forEach(proxy=>{
      const norm=normalizeName(proxy.name);
      const hit=datas.find(r=>r.regex.test(norm));
      if(hit){ const s=seen.get(hit.name); if(!s.has(proxy.name)){ map.get(hit.name).proxies.push(proxy.name); s.add(proxy.name);} }
      else if(!otherSeen.has(proxy.name)){ other.push(proxy.name); otherSeen.add(proxy.name); }
    });
    const active=datas.map(r=>({...r,proxies:uniq(r.proxies)})).filter(r=>r.proxies.length>0);
    const activeSet=new Set(active.map(r=>r.name)), activeMap=new Map(active.map(r=>[r.name,r]));
    // OT 兜底
    const otProxies=uniq(other);
    if(otProxies.length>0){ const ot={name:"OT", icon:"OT.png", proxies:otProxies}; active.push(ot); activeSet.add("OT"); activeMap.set("OT",ot); }
    return {activeRegions:active, activeRegionNameSet:activeSet, activeRegionMap:activeMap, otherProxyNames:[] };
  };
  const buildAiProxyList = (activeRegions=[], allNormalNames=[]) => {
    const nonHk=uniq(activeRegions.filter(r=>r.name!=="HK").flatMap(r=>r.proxies));
    return nonHk.length>0 ? nonHk : allNormalNames;
  };

  // ==================== 3. 策略组 ====================
  const createGroupFactory = (groups, base) => (name,type,proxies,icon="Available.png",extra={})=>{
    const u=uniq(proxies); if(!name||u.length===0) return; groups.push({name,type,proxies:u,icon:base+icon,...extra});
  };
  const buildClashmiGroups = ({allNormalNames, activeRegionMap, activeRegionNameSet})=>{
    const groups=[]; const f=createGroupFactory(groups, "https://v4.gh-proxy.org/https://github.com/cgoder/clash_rules/raw/main/icons/");
    // 核心
    const hasHK=activeRegionNameSet.has("HK"), hasTW=activeRegionNameSet.has("TW"), hasSG=activeRegionNameSet.has("SG"), hasJP=activeRegionNameSet.has("JP"), hasUS=activeRegionNameSet.has("US");
    const lb = (n,icon,reg)=>{ const r=activeRegionMap.get(reg); if(r) f(n,"load-balance",r.proxies,icon,{...SETTINGS.LOAD_BALANCE_EXTRA}); };
    const ut = (n,icon,reg)=>{ const r=activeRegionMap.get(reg); if(r) f(n,"url-test",r.proxies,icon,{...SETTINGS.URL_TEST_EXTRA}); };
    const manual = (n,icon,reg)=>{ const r=activeRegionMap.get(reg); if(r) f(n,"select",r.proxies,icon); else if(reg==="OT" && activeRegionMap.get("OT")) f(n,"select",activeRegionMap.get("OT").proxies,icon); };
    // 一键/手动/直连 动态生成
    const availableLBUT=[]; if(hasHK) availableLBUT.push("香港负载均衡","香港速度优先"); if(hasTW) availableLBUT.push("台湾负载均衡","台湾速度优先"); if(hasSG) availableLBUT.push("新加坡负载均衡","新加坡速度优先"); if(hasJP) availableLBUT.push("日本负载均衡","日本速度优先"); if(hasUS) availableLBUT.push("美国负载均衡","美国速度优先");
    const availableManual=[]; ["AS","EU","AM","OT"].forEach(k=>{ if(activeRegionNameSet.has(k)) availableManual.push(k==="AS"?"亚洲手动":k==="EU"?"欧洲手动":k==="AM"?"美洲手动":"其他手动"); });
    const oneKeyProxies=uniq(["Fallback - 全部", ...availableLBUT, ...availableManual]);
    f("一键代理","select", oneKeyProxies.length?oneKeyProxies:["DIRECT"], "Rocket.png");
    f("手动选择","select", availableManual.length?availableManual:["DIRECT"], "Rocket.png");
    // 一键代理 前置 Fallback - 全部 实现 mihomoScript.js 的秒切容灾（select 本身不测速，但首位 Fallback 会自动剔除死节点）
    f("国内直连","select",["DIRECT"],"China.png",{hidden:true});
    lb("香港负载均衡","HK.png","HK"); ut("香港速度优先","HK.png","HK");
    lb("台湾负载均衡","TW.png","TW"); ut("台湾速度优先","TW.png","TW");
    lb("新加坡负载均衡","SG.png","SG"); ut("新加坡速度优先","SG.png","SG");
    lb("日本负载均衡","JP.png","JP"); ut("日本速度优先","JP.png","JP");
    lb("美国负载均衡","US.png","US"); ut("美国速度优先","US.png","US");
    // 服务组：AI/流媒体 等走代理，Microsoft/Apple 默认 DIRECT 优先（对齐 mihomoScript.js direct:true）
    const op=uniq(["一键代理","手动选择","国内直连",...availableLBUT,...availableManual]);
    const ldDirectFirst=uniq(["国内直连","DIRECT","一键代理","手动选择",...availableLBUT.slice(0,5)]);
    [["ChatGPT","ChatGPT.png"],["Claude","Claude.png"],["Gemini","Gemini.png"],["流媒体","Netflix.png"],["通信","Telegram.png"],["云服务","GitHub.png"],["金融","PayPal.png"]].forEach(([n,i])=>f(n,"select",op,i));
    [["Microsoft","Microsoft.png"],["OneDrive","OneDrive.png"],["Apple","Apple.png"]].forEach(([n,i])=>f(n,"select",ldDirectFirst,i));
    f("漏网之鱼","select",op,"MATCH.png");
    manual("亚洲手动","AS.png","AS"); manual("欧洲手动","EU.png","EU"); manual("美洲手动","AM.png","AM"); manual("其他手动","OT.png","OT");
    // Fallback / URL Test 双组（对齐 mihomoScript.js 的 自动选择/负载均衡）
    const allNames=uniq(allNormalNames);
    if(allNames.length){ f("URL Test - 全部","url-test",allNames,"Available.png",SETTINGS.URL_TEST_EXTRA); f("Fallback - 全部","fallback",allNames,"Available.png",SETTINGS.FALLBACK_EXTRA); }
    return groups;
  };

  // ==================== 4. 规则 ====================
  // 1:1 对齐 clashmi.yml：domain/ipcidr 均为 mrs，classical 为 text；URL 均经 gh-proxy；补 path 避免 BettBox 缓存 404
  const mrsDN = (file)=>({ type:"http", interval:86400, behavior:"domain", format:"mrs", url:`https://v4.gh-proxy.org/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/${file}`, path:`./ruleset/${file}` });
  const mrsIP = (file)=>({ type:"http", interval:86400, behavior:"ipcidr", format:"mrs", url:`https://v4.gh-proxy.org/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/${file}`, path:`./ruleset/${file}` });
  const buildRuleProviders = ()=>({
    private_domain: mrsDN("geosite/private.mrs"),
    private_ip: mrsIP("geoip/private.mrs"),
    ntp_domain: mrsDN("geosite/category-ntp.mrs"),
    openai_domain: mrsDN("geosite/openai.mrs"),
    anthropic_domain: mrsDN("geosite/anthropic.mrs"),
    google_gemini_domain: mrsDN("geosite/google-gemini.mrs"),
    youtube_domain: mrsDN("geosite/youtube.mrs"),
    netflix_domain: mrsDN("geosite/netflix.mrs"),
    netflix_ip: mrsIP("geoip/netflix.mrs"),
    tiktok_domain: mrsDN("geosite/tiktok.mrs"),
    disney_domain: mrsDN("geosite/disney.mrs"),
    spotify_domain: mrsDN("geosite/spotify.mrs"),
    appletv_domain: mrsDN("geosite/apple-tvplus.mrs"),
    telegram_domain: mrsDN("geosite/telegram.mrs"),
    telegram_ip: mrsIP("geoip/telegram.mrs"),
    twitter_domain: mrsDN("geosite/twitter.mrs"),
    twitter_ip: mrsIP("geoip/twitter.mrs"),
    google_domain: mrsDN("geosite/google.mrs"),
    google_ip: mrsIP("geoip/google.mrs"),
    github_domain: mrsDN("geosite/github.mrs"),
    speedtest_domain: mrsDN("geosite/ookla-speedtest.mrs"),
    paypal_domain: mrsDN("geosite/paypal.mrs"),
    geolocation_not_cn: mrsDN("geosite/geolocation-!cn.mrs"), // keep quoted due to !
    apple_domain: mrsDN("geosite/apple.mrs"),
    apple_ip: { type:"http", interval:86400, behavior:"ipcidr", format:"mrs", url:"https://v4.gh-proxy.org/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo-lite/geoip/apple.mrs", path:"./ruleset/geo-lite/geoip/apple.mrs" },
    onedrive_domain: mrsDN("geosite/onedrive.mrs"),
    microsoft_domain: mrsDN("geosite/microsoft.mrs"),
    cn_domain: mrsDN("geosite/cn.mrs"),
    cn_ip: mrsIP("geoip/cn.mrs"),
    ResourceSite: { type:"http", interval:86400, behavior:"classical", format:"text", url:"https://v4.gh-proxy.org/https://raw.githubusercontent.com/eulac-dev/Proxy/refs/heads/main/Shadowrocket/Rules/ResourceSite.list" },
    PanVod: { type:"http", interval:86400, behavior:"classical", format:"text", url:"https://v4.gh-proxy.org/https://raw.githubusercontent.com/eulac-dev/Proxy/refs/heads/main/Shadowrocket/Rules/PanVod.list" },
    add_direct_domain: { type:"http", interval:86400, behavior:"domain", format:"mrs", url:"https://v4.gh-proxy.org/https://raw.githubusercontent.com/Seven1echo/Yaml/refs/heads/main/rules/Seven1_Direct_Domain.mrs" },
    my_direct: { type:"http", interval:86400, behavior:"classical", format:"text", url:"https://v4.gh-proxy.org/https://raw.githubusercontent.com/cgoder/clash_rules/main/rules/my_direct.list" },
    my_proxy: { type:"http", interval:86400, behavior:"classical", format:"text", url:"https://v4.gh-proxy.org/https://raw.githubusercontent.com/cgoder/clash_rules/main/rules/my_proxy.list" },
  });
  const buildRules = (bypass=[])=>[
    "RULE-SET,private_ip,国内直连,no-resolve","RULE-SET,private_domain,国内直连","RULE-SET,ntp_domain,国内直连",
    "RULE-SET,my_proxy,一键代理","RULE-SET,my_direct,国内直连",
    ...uniq(bypass).map(d=>`DOMAIN-SUFFIX,${d},DIRECT`), ...SETTINGS.DIRECT_FIX_RULES,
    "RULE-SET,openai_domain,ChatGPT","RULE-SET,anthropic_domain,Claude","RULE-SET,google_gemini_domain,Gemini",
    "RULE-SET,youtube_domain,流媒体","RULE-SET,netflix_domain,流媒体","RULE-SET,netflix_ip,流媒体,no-resolve","RULE-SET,tiktok_domain,流媒体","RULE-SET,disney_domain,流媒体","RULE-SET,spotify_domain,流媒体","RULE-SET,appletv_domain,流媒体",
    "RULE-SET,telegram_domain,通信","RULE-SET,telegram_ip,通信,no-resolve","RULE-SET,twitter_domain,通信","RULE-SET,twitter_ip,通信,no-resolve",
    "RULE-SET,google_domain,云服务","RULE-SET,google_ip,云服务,no-resolve","RULE-SET,github_domain,云服务","RULE-SET,speedtest_domain,云服务",
    "RULE-SET,paypal_domain,金融",
    "RULE-SET,apple_domain,Apple","RULE-SET,apple_ip,Apple,no-resolve",
    "RULE-SET,onedrive_domain,OneDrive","RULE-SET,microsoft_domain,Microsoft",
    "RULE-SET,ResourceSite,国内直连","RULE-SET,PanVod,国内直连","RULE-SET,add_direct_domain,国内直连","RULE-SET,cn_domain,国内直连","RULE-SET,cn_ip,国内直连,no-resolve",
    "MATCH,漏网之鱼",
  ];

  // ==================== 5. 网络 ====================
  const applySniffer=c=>{ c.sniffer={...c.sniffer, enable:true, "force-dns-mapping":true, "parse-pure-ip":true, "override-destination":true, sniff:{HTTP:{ports:[80,"8080-8880"],"override-destination":true}, TLS:{ports:[443,8443]}, QUIC:{ports:[443,8443]}}, "force-domain": SETTINGS.FORCE_DOMAIN}; };
  const applyTun=c=>{ c.tun={...c.tun, enable:true, stack:"system", "auto-route":true, "auto-detect-interface":true, "strict-route":true, "dns-hijack":["any:53","tcp://any:53"]}; };
  const applyDns=c=>{
    const cur=c.dns?.["fake-ip-filter"]||[]; c.dns={...c.dns, enable:true, "cache-algorithm":"arc", ipv6:false, listen:c.dns?.listen||"0.0.0.0:7874", "enhanced-mode":"fake-ip", "fake-ip-range":"198.18.0.1/16", "fake-ip-filter":uniq([...cur,...SETTINGS.BASIC_FAKE_IP_FILTER]), "default-nameserver":["223.5.5.5#DIRECT","119.29.29.29#DIRECT"], "nameserver-policy":{"geosite:cn":["223.5.5.5#DIRECT","119.29.29.29#DIRECT"], "geosite:private":"system", "geosite:microsoft":["223.5.5.5#DIRECT"], "geosite:apple":["223.5.5.5#DIRECT"], "+.apple.com":["223.5.5.5#DIRECT"], "+.icloud.com":["223.5.5.5#DIRECT"], "+.microsoft.com":["223.5.5.5#DIRECT"], "+.office365.com":["223.5.5.5#DIRECT"], "+.live.com":["223.5.5.5#DIRECT"], "rule-set:openai_domain":["https://1.1.1.1/dns-query#一键代理","https://8.8.8.8/dns-query#一键代理"], "rule-set:anthropic_domain":["https://1.1.1.1/dns-query#一键代理"], "rule-set:google_gemini_domain":["https://1.1.1.1/dns-query#一键代理"], "+.orb.local":"system"}, nameserver:["https://1.1.1.1/dns-query#一键代理","https://8.8.8.8/dns-query#一键代理"], "proxy-server-nameserver":["223.5.5.5#DIRECT","119.29.29.29#DIRECT","system"], "direct-nameserver":["223.5.5.5#DIRECT","119.29.29.29#DIRECT","system"], "direct-nameserver-follow-policy":true};
  }; // Microsoft/Apple/iCloud 全走 DIRECT，避免 18.182.54.241 死节点拖垮 DoH


  const applyProfile=c=>{ c.profile={...c.profile, "store-selected":false, "store-fake-ip":false}; }; // BettBox 强制 store-selected:false，避免记住死节点

  // ==================== 6. 主流程 ====================
  config=ensureConfigObject(config);
  const originalProxies=getOriginalProxies(config);
  if(originalProxies.length===0) return config;
  makeProxyNamesUnique(originalProxies);
  const {infoProxies, normalProxies}=splitInfoAndNormalProxies(originalProxies, SETTINGS.FILTER_REGEX);
  const {activeRegions, activeRegionNameSet, activeRegionMap}=classifyProxiesByRegion(normalProxies, REGIONS);
  const allNormalNames=uniq(normalProxies.map(p=>p.name)), infoNames=uniq(infoProxies.map(p=>p.name));
  // 策略组（动态，仅含活跃地域，避免空组导致 Go: use or proxies missing）
  config["proxy-groups"]=buildClashmiGroups({allNormalNames, activeRegionMap, activeRegionNameSet});
  if(infoNames.length) config["proxy-groups"].push({name:"Info", type:"select", proxies:infoNames, icon: SETTINGS.ICON_BASE+"Available.png"});
  // 兜底：仍为空则保底 DIRECT
  if(config["proxy-groups"].length===0) config["proxy-groups"]=[{name:"一键代理", type:"select", proxies:["DIRECT"], icon: SETTINGS.ICON_BASE+"Proxy.png"}];
  config["rule-providers"]=buildRuleProviders();
  config.rules=buildRules(bypassDomains);
  applySniffer(config); applyTun(config); applyDns(config); applyProfile(config);
  config.proxies=originalProxies;
  return config;
}
