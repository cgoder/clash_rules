// flclash.js —— FlClash 覆写脚本
//
// 来源：基于 Gemini 生成的 gemini-code-1792722585390.js 修订而成。
// 修订目标：空组不再静默直连、节点引用保持自洽、AI 候选池受约束（含 AI 地区子组同口径）、名称分类有边界。
// 评价过程与证据见 temp/notes/gemini-flclash-review.md（临时工件，不入库）。
//
// 与 clash.js 无派生关系：这是独立的第三方脚本修订版，组名与规则自成一系。
// 改动本文件后需重新跑 mihomo -t 校验，并复查空节点、仅美国节点两种样本。
function main(config) {
  var GROUP_ORDER = ["节点选择", "AI专线", "研发加速", "流媒体服务", "AI自动选择", "亚太智能优选", "故障自动转移", "手动选择"];
  var FIXED_GROUP_NAMES = ["节点选择", "AI专线", "研发加速", "流媒体服务", "AI自动选择", "亚太智能优选", "故障自动转移", "手动选择", "香港节点", "台湾节点", "新加坡节点", "日本节点", "韩国节点", "美国节点", "AI-美国", "AI-日本", "AI-台湾", "AI-新加坡", "AI-韩国"];
  var BUILTIN = ["DIRECT", "REJECT", "REJECT-DROP", "PASS", "COMPATIBLE", "GLOBAL"];

  // 倍率标记只删 >=2 的整数倍率与带小数的倍率，保留 1x 这类正常标价。
  var NOISE = "剩余|流量|到期|官网|重置|套餐|订阅|域名|地址|失联|距离|下次|通知|公告|客服|群组|频道|备用|网址|禁止|测速|说明|使用|教程|过滤|expire|traffic|website|reset|群|倍率" +
    "|(?:[2-9](?:\\.\\d+)?|[1-9][0-9]+(?:\\.\\d+)?|1\\.\\d+)x(?![0-9A-Za-z])";

  // ASCII 国家码要求前后不是字母，避免 AUS/RUS 被当成 US，SG 被当成 G。
  function code(alt) {
    return "(?:^|[^A-Za-z])(?:" + alt + ")(?:[^A-Za-z]|$)";
  }
  var PAT = {
    hk: "香港|港|" + code("HK|HKG|HGC|WTT|HKT|CMI|Hong ?Kong"),
    tw: "台湾|臺灣|台北|新北|彰化|台|" + code("TW|TWN|Taiwan|Hinet"),
    sg: "新加坡|狮城|" + code("SG|SGP|Singapore"),
    jp: "日本|东京|大阪|埼玉|日|" + code("JP|JPN|Japan|Tokyo|Osaka"),
    kr: "韩国|首尔|韩|" + code("KR|KOR|Korea|Seoul"),
    us: "美国|美西|美东|洛杉矶|圣何塞|西雅图|芝加哥|硅谷|波特兰|达拉斯|" + code("US|USA|United ?States|America|Los ?Angeles|San ?Jose|Seattle"),
    banned: "香港|港|澳门|澳門|Macau|俄|Russia|回国|中国|大陆|" + code("HK|MO|RU|CN|China")
  };
  var RE = {};
  for (var key in PAT) RE[key] = new RegExp(PAT[key], "i");
  var RE_NOISE = new RegExp(NOISE, "i");
  function hit(name, key) { return RE[key].test(name); }
  function mihomo(key) { return "(?i)" + PAT[key]; }
  function mihomoAll(keys) { return "(?i)(?:" + keys.map(function (k) { return PAT[k]; }).join(")|(?:") + ")"; }

  // 1. 统一噪音口径：清理、分组、手动选择使用同一个过滤表。
  var raw = Array.isArray(config["proxies"]) ? config["proxies"] : [];
  var kept = [];
  var seen = {};
  for (var i = 0; i < raw.length; i++) {
    var p = raw[i];
    if (!p || typeof p.name !== "string" || !p.name) continue;
    if (RE_NOISE.test(p.name)) continue;
    if (seen[p.name]) continue;
    seen[p.name] = true;
    kept.push(p);
  }

  // 2. 先替换策略组名，再让节点名与策略组名、内置出站、彼此都不冲突。
  var hasProviders = !!(config["proxy-providers"] && Object.keys(config["proxy-providers"]).length);
  var reserved = {};
  var i2;
  for (i2 = 0; i2 < GROUP_ORDER.length; i2++) reserved[GROUP_ORDER[i2]] = true;
  // 地区组与测速组是固定生成的组名，也必须与节点名互斥。
  for (i2 = 0; i2 < FIXED_GROUP_NAMES.length; i2++) reserved[FIXED_GROUP_NAMES[i2]] = true;
  for (i2 = 0; i2 < BUILTIN.length; i2++) reserved[BUILTIN[i2]] = true;
  var renamed = {};
  function uniqueName(base) {
    var candidate = base;
    var n = 2;
    while (reserved[candidate] || seen[candidate]) candidate = base + " (" + (n++) + ")";
    return candidate;
  }
  for (i2 = 0; i2 < kept.length; i2++) {
    var node = kept[i2];
    if (!reserved[node.name]) continue;
    var fresh = uniqueName(node.name + " ·节点");
    renamed[node.name] = fresh;
    delete seen[node.name];
    seen[fresh] = true;
    node.name = fresh;
  }

  // 3. dialer-proxy 跟随改名。悬空引用的清理放到策略组生成之后，才能以真实存在的组名为准。
  var names = [];
  for (i2 = 0; i2 < kept.length; i2++) names.push(kept[i2].name);
  for (i2 = 0; i2 < kept.length; i2++) {
    var dialer = kept[i2]["dialer-proxy"];
    if (typeof dialer === "string" && dialer && renamed[dialer]) kept[i2]["dialer-proxy"] = renamed[dialer];
  }
  if (raw.length > 0) config["proxies"] = kept;

  // 4. 地区分类：重叠标签保留在各地区组，但 AI 候选池排除任何命中禁区的节点。
  var regions = [
    { key: "hk", name: "香港节点", apac: true },
    { key: "tw", name: "台湾节点", apac: true },
    { key: "sg", name: "新加坡节点", apac: true },
    { key: "jp", name: "日本节点", apac: true },
    { key: "kr", name: "韩国节点", apac: true },
    { key: "us", name: "美国节点", apac: false }
  ];
  function inRegion(name, key) { return RE[key].test(name); }
  function pick(keys) {
    var out = [];
    for (var n = 0; n < names.length; n++) {
      for (var k = 0; k < keys.length; k++) {
        if (inRegion(names[n], keys[k])) { out.push(names[n]); break; }
      }
    }
    return out;
  }
  var apacKeys = ["hk", "tw", "sg", "jp", "kr"];
  PAT.apac = apacKeys.map(function (k) { return "(?:" + PAT[k] + ")"; }).join("|");
  RE.apac = new RegExp(PAT.apac, "i");
  var regionMembers = {};
  for (i2 = 0; i2 < regions.length; i2++) regionMembers[regions[i2].key] = pick([regions[i2].key]);
  var apacMembers = pick(apacKeys);
  var aiMembers = [];
  for (i2 = 0; i2 < names.length; i2++) {
    var nm = names[i2];
    if (hit(nm, "banned")) continue;
    var labels = 0;
    if (inRegion(nm, "tw")) labels++;
    if (inRegion(nm, "sg")) labels++;
    if (inRegion(nm, "jp")) labels++;
    if (inRegion(nm, "kr")) labels++;
    if (inRegion(nm, "us")) labels++;
    if (labels === 0) continue;
    // 多地区标签（如“台湾中转 美国”）无法从名称判定真实出口，不放进 AI 候选池。
    if (labels > 1) continue;
    aiMembers.push(nm);
  }

  // 5. 只创建有真实成员的组；provider 节点名在脚本阶段不可见，只能保留过滤组。
  var groups = [];
  function addGroup(g) { groups.push(g); }
  function withEmptyFallback(g) { if (!g["empty-fallback"]) g["empty-fallback"] = "REJECT"; return g; }
  var URL_TEST = { type: "url-test", url: "https://www.gstatic.com/generate_204", interval: 300, tolerance: 30, "expected-status": 204 };

  var regionGroups = [];
  for (i2 = 0; i2 < regions.length; i2++) {
    var r = regions[i2];
    var members = regionMembers[r.key];
    if (members.length === 0 && !hasProviders) continue;
    var g = { name: r.name, type: "url-test", url: URL_TEST.url, interval: 300, tolerance: r.key === "us" ? 50 : 20, "expected-status": 204 };
    if (hasProviders) {
      g["include-all"] = true;
      g.filter = mihomo(r.key);
      g["exclude-filter"] = "(?i)" + NOISE;
    } else {
      g.proxies = members;
    }
    regionGroups.push(withEmptyFallback(g));
  }
  function regionGroupNames(keys) {
    var out = [];
    for (var n = 0; n < regions.length; n++) {
      if (!keys || keys.indexOf(regions[n].key) >= 0) {
        var exists = false;
        for (var m = 0; m < regionGroups.length; m++) if (regionGroups[m].name === regions[n].name) exists = true;
        if (exists) out.push(regions[n].name);
      }
    }
    return out;
  }

  var apacGroup = withEmptyFallback({
    name: "亚太智能优选", type: "url-test", url: URL_TEST.url, interval: 300, tolerance: 30, "expected-status": 204
  });
  if (hasProviders) {
    apacGroup["include-all"] = true;
    apacGroup.filter = mihomo("apac");
    apacGroup["exclude-filter"] = "(?i)" + NOISE;
  } else {
    apacGroup.proxies = apacMembers;
  }

  var fallbackGroup = withEmptyFallback({
    name: "故障自动转移", type: "fallback", url: URL_TEST.url, interval: 180, "expected-status": 204
  });
  if (hasProviders) {
    fallbackGroup["include-all"] = true;
    fallbackGroup.filter = mihomo("apac");
    fallbackGroup["exclude-filter"] = "(?i)" + NOISE;
  } else {
    fallbackGroup.proxies = apacMembers;
  }

  var aiAuto = withEmptyFallback({
    name: "AI自动选择", type: "url-test", url: URL_TEST.url, interval: 300, tolerance: 100, "expected-status": 204
  });
  if (hasProviders) {
    aiAuto["include-all"] = true;
    aiAuto.filter = mihomoAll(["tw", "sg", "jp", "us", "kr"]);
    aiAuto["exclude-filter"] = "(?i)" + NOISE + "|" + PAT.banned;
  } else {
    aiAuto.proxies = aiMembers;
  }

  // AI 专属地区组：把 AI 单池切成地区视图，供 AI专线 手动锁地区 / 在地区内固定单节点。
  // 成员口径与 AI自动选择 完全一致（禁区排除；无 provider 时多标签在 JS 侧已剔除）。
  // 刻意不复用 台湾节点/美国节点 等通用地区组：它们的 filter 不带禁区排除，
  // 会重新引入「香港中转 美国」这类被 AI 池剔除的中转节点，且在这些组内
  // 固定节点会泄漏到 研发加速/流媒体服务 等所有引用方。
  var AI_REGIONS = [
    { key: "us", name: "AI-美国" },
    { key: "jp", name: "AI-日本" },
    { key: "tw", name: "AI-台湾" },
    { key: "sg", name: "AI-新加坡" },
    { key: "kr", name: "AI-韩国" }
  ];
  var aiRegionGroups = [];
  var aiRegionNames = [];
  if (aiMembers.length > 0 || hasProviders) {
    for (i2 = 0; i2 < AI_REGIONS.length; i2++) {
      var ar = AI_REGIONS[i2];
      var aiRegionMembers = [];
      for (var m3 = 0; m3 < aiMembers.length; m3++) {
        if (inRegion(aiMembers[m3], ar.key)) aiRegionMembers.push(aiMembers[m3]);
      }
      if (aiRegionMembers.length === 0 && !hasProviders) continue;
      var aiRegion = withEmptyFallback({
        name: ar.name, type: "url-test", url: URL_TEST.url, interval: 300,
        // tolerance 对齐 AI自动选择（100）：通用地区组的 20/50 对 AI 长连接
        // 过于敏感，会把低容忍乒乓带进 SSE 流。
        tolerance: 100, "expected-status": 204
      });
      if (hasProviders) {
        aiRegion["include-all"] = true;
        aiRegion.filter = mihomo(ar.key);
        aiRegion["exclude-filter"] = "(?i)" + NOISE + "|" + PAT.banned;
      } else {
        aiRegion.proxies = aiRegionMembers;
      }
      aiRegionGroups.push(aiRegion);
      aiRegionNames.push(ar.name);
    }
  }

  var aiSelect = { name: "AI专线", type: "select", "empty-fallback": "REJECT" };
  var aiChoices = [];
  if (aiMembers.length > 0 || hasProviders) aiChoices.push("AI自动选择");
  // AI 地区子组只做手动杠杆，默认仍是 AI自动选择（跨区自动容错不变）。
  // 通用地区组不进 AI 候选：其 filter 不带禁区排除，会重新引入顶层过滤拒绝的节点，形成绕过。
  aiChoices = aiChoices.concat(aiRegionNames);
  if (!hasProviders) {
    for (i2 = 0; i2 < aiMembers.length; i2++) aiChoices.push(aiMembers[i2]);
  }
  aiSelect.proxies = aiChoices.length ? aiChoices : ["REJECT"];

  var manual = { name: "手动选择", type: "select", "empty-fallback": "REJECT" };
  if (hasProviders) {
    manual["include-all"] = true;
    manual["exclude-filter"] = "(?i)" + NOISE;
  } else {
    manual.proxies = names.length ? names : ["DIRECT"];
  }

  // 6. 入口组的成员只引用真实存在的组，默认落在第一个真实可用的选项上。
  var fastOptions = [];
  if (apacMembers.length > 0 || hasProviders) fastOptions.push("亚太智能优选");
  if (apacMembers.length > 0 || hasProviders) fastOptions.push("故障自动转移");
  var allRegionNames = regionGroupNames(null);
  var proxyOptions = fastOptions.concat(allRegionNames);
  var devChoices = proxyOptions.concat(["节点选择", "DIRECT"]);
  var mediaChoices = [];
  var mediaPreference = ["香港节点", "台湾节点", "新加坡节点", "日本节点", "美国节点"];
  if (fastOptions.length) mediaChoices.push("亚太智能优选");
  for (i2 = 0; i2 < mediaPreference.length; i2++) {
    if (allRegionNames.indexOf(mediaPreference[i2]) >= 0) mediaChoices.push(mediaPreference[i2]);
  }
  mediaChoices.push("节点选择");

  var selectChoices = proxyOptions.slice();
  if (allRegionNames.length || fastOptions.length) selectChoices.push("手动选择");
  selectChoices.push("DIRECT");
  var uniq = [];
  var used = {};
  for (i2 = 0; i2 < selectChoices.length; i2++) {
    if (!used[selectChoices[i2]]) { used[selectChoices[i2]] = true; uniq.push(selectChoices[i2]); }
  }
  var mainSelect = withEmptyFallback({ name: "节点选择", type: "select", proxies: uniq });
  var devSelect = withEmptyFallback({ name: "研发加速", type: "select", proxies: devChoices });
  var mediaSelect = withEmptyFallback({ name: "流媒体服务", type: "select", proxies: mediaChoices });

  addGroup(mainSelect);
  addGroup(aiSelect);
  addGroup(devSelect);
  addGroup(mediaSelect);
  if (aiMembers.length > 0 || hasProviders) addGroup(aiAuto);
  for (i2 = 0; i2 < aiRegionGroups.length; i2++) addGroup(aiRegionGroups[i2]);
  if (apacMembers.length > 0 || hasProviders) addGroup(apacGroup);
  if (apacMembers.length > 0 || hasProviders) addGroup(fallbackGroup);
  for (i2 = 0; i2 < regionGroups.length; i2++) addGroup(regionGroups[i2]);
  addGroup(manual);
  config["proxy-groups"] = groups;

  // 7. 以真实生成的组名为准，清空指向不存在对象的 dialer-proxy。
  var finalGroupNames = {};
  for (i2 = 0; i2 < groups.length; i2++) finalGroupNames[groups[i2].name] = true;
  for (i2 = 0; i2 < BUILTIN.length; i2++) finalGroupNames[BUILTIN[i2]] = true;
  var nameSet = {};
  for (i2 = 0; i2 < kept.length; i2++) nameSet[kept[i2].name] = true;
  for (i2 = 0; i2 < kept.length; i2++) {
    var outbound = kept[i2]["dialer-proxy"];
    if (typeof outbound !== "string" || !outbound) continue;
    if (nameSet[outbound] || finalGroupNames[outbound]) continue;
    delete kept[i2]["dialer-proxy"];
  }

  // 8. 规则集与路由顺序保持原设计。
  var ghProxy = "https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@meta/geo/";
  function createMrsRule(urlPath, behaviorType) {
    return {
      type: "http",
      behavior: behaviorType,
      format: "mrs",
      url: ghProxy + urlPath,
      path: "./ruleset/" + urlPath.split("/").join("_"),
      interval: 86400
    };
  }
  config["rule-providers"] = {
    "private-domain": createMrsRule("geosite/private.mrs", "domain"),
    "private-ip": createMrsRule("geoip/private.mrs", "ipcidr"),
    "ads-domain": createMrsRule("geosite/category-ads-all.mrs", "domain"),
    "openai": createMrsRule("geosite/openai.mrs", "domain"),
    "anthropic": createMrsRule("geosite/anthropic.mrs", "domain"),
    "google-gemini": createMrsRule("geosite/google-gemini.mrs", "domain"),
    "github": createMrsRule("geosite/github.mrs", "domain"),
    "docker": createMrsRule("geosite/docker.mrs", "domain"),
    "youtube": createMrsRule("geosite/youtube.mrs", "domain"),
    "google": createMrsRule("geosite/google.mrs", "domain"),
    "netflix": createMrsRule("geosite/netflix.mrs", "domain"),
    "telegram-domain": createMrsRule("geosite/telegram.mrs", "domain"),
    "telegram-ip": createMrsRule("geoip/telegram.mrs", "ipcidr"),
    "apple-cn": createMrsRule("geosite/apple-cn.mrs", "domain"),
    "microsoft-cn": createMrsRule("geosite/microsoft@cn.mrs", "domain"),
    "geolocation-not-cn": createMrsRule("geosite/geolocation-!cn.mrs", "domain"),
    "cn-domain": createMrsRule("geosite/cn.mrs", "domain"),
    "cn-ip": createMrsRule("geoip/cn.mrs", "ipcidr")
  };

  config["rules"] = [
    "PROCESS-NAME,easytier-core,DIRECT",
    "PROCESS-NAME,easytier-core.exe,DIRECT",
    "PROCESS-NAME,wireguard,DIRECT",
    "PROCESS-NAME,wireguard.exe,DIRECT",
    "PROCESS-NAME,Qsync.exe,DIRECT",
    "DOMAIN-SUFFIX,leoao-inc.com,DIRECT",
    "DOMAIN-SUFFIX,myqnapcloud.com,DIRECT",
    "DOMAIN-SUFFIX,myqnapcloud.cn,DIRECT",
    "RULE-SET,private-domain,DIRECT",
    "RULE-SET,private-ip,DIRECT,no-resolve",
    // SideStore / LiveContainer 续签认证端点必须显式走代理。
    // 不写这三条时它们依赖 geolocation-not-cn 间接命中代理，但
    // apple-cn 排在该规则集之前：上游一旦把域名并入 apple-cn，就会被判
    // 国内直连而续签失败（报 “could not determine this device's UDID”）。
    // 实测当前 geolocation-not-cn 命中，属运气而非保证，故改为显式规则。
    "DOMAIN,gsa.apple.com,节点选择",
    "DOMAIN,developerservices2.apple.com,节点选择",
    "DOMAIN,gspe1-ssl.ls.apple.com,节点选择",
    "AND,((NETWORK,UDP),(DST-PORT,443),(RULE-SET,youtube)),REJECT",
    "AND,((NETWORK,UDP),(DST-PORT,443),(RULE-SET,google)),REJECT",
    "RULE-SET,ads-domain,REJECT",
    "RULE-SET,openai,AI专线",
    "RULE-SET,anthropic,AI专线",
    "RULE-SET,google-gemini,AI专线",
    "DOMAIN-SUFFIX,claude.ai,AI专线",
    "DOMAIN-SUFFIX,cursor.sh,AI专线",
    "DOMAIN-SUFFIX,cursor.com,AI专线",
    "DOMAIN-SUFFIX,openrouter.ai,AI专线",
    "RULE-SET,github,研发加速",
    "RULE-SET,docker,研发加速",
    "DOMAIN-SUFFIX,pypi.org,研发加速",
    "DOMAIN-SUFFIX,pythonhosted.org,研发加速",
    "DOMAIN-SUFFIX,npmjs.org,研发加速",
    "DOMAIN-SUFFIX,bun.sh,研发加速",
    "DOMAIN-SUFFIX,huggingface.co,研发加速",
    "DOMAIN-SUFFIX,hf.co,研发加速",
    "RULE-SET,youtube,流媒体服务",
    "RULE-SET,netflix,流媒体服务",
    "RULE-SET,telegram-domain,节点选择",
    "RULE-SET,telegram-ip,节点选择,no-resolve",
    "RULE-SET,google,节点选择",
    "RULE-SET,apple-cn,DIRECT",
    "RULE-SET,microsoft-cn,DIRECT",
    "RULE-SET,geolocation-not-cn,节点选择",
    "RULE-SET,cn-domain,DIRECT",
    "RULE-SET,cn-ip,DIRECT,no-resolve",
    "MATCH,节点选择"
  ];

  config["ipv6"] = false;
  config["unified-delay"] = true;
  config["tcp-concurrent"] = true;
  config["find-process-mode"] = "strict";
  // global-client-fingerprint 已被内核移除，改为按协议在节点上设置 client-fingerprint。

  config["tun"] = {
    enable: true,
    stack: "mixed",
    "auto-route": true,
    "auto-detect-interface": true,
    // SideStore / LiveContainer 免电脑续签：把 10.7.0.1 当回环地址，
    // 让 App 连本机 10.7.0.1 的 lockdown 通道在设备内部自环，替代 LocalDevVPN。
    // 该键只声明地址，真正的反射由 sing-tun 各栈自行处理（system / mixed /
    // gvisor / mipstack 均有判定），所以 stack 不必改成 gvisor。
    "loopback-address": ["10.7.0.1"],
    // 严格路由会强制劫持本地/内网流量，易导致自环失败。
    "strict-route": false,
    "dns-hijack": ["any:53", "tcp://any:53"],
    // 10.0.0.0/8 与 10.7.0.0/24 必须排除在列表外：loopback 用的是 10.7.0.1，
    // 一旦整段被排除，续签会失效。100.64.0.0/10 仍保留（运营商级 NAT）。
    "route-exclude-address": [
      "192.168.0.0/16", "172.16.0.0/12", "100.64.0.0/10",
      "169.254.0.0/16", "fc00::/7", "fe80::/10"
    ]
  };

  config["sniffer"] = {
    enable: true,
    "parse-pure-ip": true,
    "override-destination": false,
    sniff: {
      HTTP: { ports: [80, 8080], "override-destination": true },
      TLS: { ports: [443, 8443] },
      QUIC: { ports: [443, 8443] }
    },
    "skip-domain": ["+.push.apple.com", "Mijia Cloud", "+.lan", "+.leoao-inc.com"]
  };

  var nsPolicy = {};
  nsPolicy["rule-set:private-domain"] = "system";
  nsPolicy["rule-set:cn-domain"] = ["https://dns.alidns.com/dns-query", "https://doh.pub/dns-query"];
  nsPolicy["+.leoao-inc.com"] = "system";
  nsPolicy["+.lan"] = "system";

  config["dns"] = {
    enable: true,
    ipv6: false,
    "prefer-h3": false,
    "enhanced-mode": "fake-ip",
    "fake-ip-range": "198.18.0.1/16",
    "default-nameserver": ["223.5.5.5", "119.29.29.29", "114.114.114.114"],
    nameserver: ["https://dns.alidns.com/dns-query", "https://doh.pub/dns-query"],
    "fake-ip-filter": [
      "+.lan", "+.local", "+.msftconnecttest.com", "+.msftncsi.com",
      "localhost.ptlogin2.qq.com", "+.stun.*.*", "+.stun.*.*.*",
      "rule-set:private-domain", "+.leoao-inc.com",
      "+.myqnapcloud.com", "+.myqnapcloud.cn"
    ],
    "nameserver-policy": nsPolicy
  };

  return config;
}
// SAFE_EOF_PADDING_DO_NOT_REMOVE_THIS_LINE_FOR_FFI_BUFFER_SAFETY
