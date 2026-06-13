// ============================================================
// 🔧 FlClash 动态配置脚本
// 基于 clashmi.yml 转换
// 说明：FlClash 在加载配置时调用 main(config)，返回修改后的配置
//
// ✅ 使用说明：
// 1️⃣ 在 FlClash 中：配置 → 覆写 → 脚本模式 → 粘贴此脚本
// 2️⃣ 保存后会自动在订阅节点基础上创建策略组和规则
// 3️⃣ 根据需要修改 PROXY_GROUPS 和 NEW_RULES 部分
// ============================================================

// ======= 用户配置区 =======

// 代理组配置（基于 clashmi.yml）
const PROXY_GROUPS = [
  // 核心出站
  {
    name: "Proxy",
    type: "select",
    proxies: ["Auto", "HK", "Asia", "NorthAmerica", "Europe", "DIRECT"]
  },
  {
    name: "AI",
    type: "select",
    proxies: ["NorthAmerica", "Europe", "HK", "Asia", "Proxy", "DIRECT"]
  },
  {
    name: "Media",
    type: "select",
    proxies: ["HK", "Asia", "NorthAmerica", "Europe", "Proxy", "DIRECT"]
  },
  {
    name: "Comm",
    type: "select",
    proxies: ["HK", "Asia", "NorthAmerica", "Europe", "Proxy", "DIRECT"]
  },
  {
    name: "Cloud",
    type: "select",
    proxies: ["Proxy", "HK", "Asia", "NorthAmerica", "Europe", "DIRECT"]
  },
  {
    name: "Finance",
    type: "select",
    proxies: ["Proxy", "NorthAmerica", "Europe", "HK", "DIRECT"]
  },
  {
    name: "Apple",
    type: "select",
    proxies: ["DIRECT", "Proxy", "HK", "Asia", "NorthAmerica"]
  },
  {
    name: "Microsoft",
    type: "select",
    proxies: ["DIRECT", "Proxy", "HK", "Asia", "NorthAmerica"]
  },
  {
    name: "Domestic",
    type: "select",
    proxies: ["DIRECT", "Proxy", "REJECT"]
  },
  {
    name: "Final",
    type: "select",
    proxies: ["Proxy", "DIRECT", "Auto", "HK", "Asia", "NorthAmerica", "Europe"]
  },

  // 自动选择组
  {
    name: "Auto",
    type: "url-test",
    match: /^(?!.*(剩余流量|距离下次重置|套餐到期|官网|流量|Traffic|Expire|更新|网址)).*$/,
    url: "https://www.gstatic.com/generate_204",
    interval: 300,
    tolerance: 80
  },

  // 地区分组 - 使用正则匹配节点
  {
    name: "HK",
    type: "url-test",
    match: /(香港|港|🇭🇰|\bHK\b|\bHKG\b|Hong)/i,
    url: "https://www.gstatic.com/generate_204",
    interval: 300,
    tolerance: 80
  },
  {
    name: "Asia",
    type: "url-test",
    match: /(香港|港|台湾|台灣|新加坡|日本|韩国|韓國|印度|泰国|泰國|马来西亚|馬來西亞|菲律宾|菲律賓|越南|印尼|🇭🇰|🇹🇼|🇸🇬|🇯🇵|🇰🇷|🇮🇳|🇹🇭|🇲🇾|🇵🇭|🇻🇳|🇮🇩|\bHK\b|\bTW\b|\bSG\b|\bJP\b|\bKR\b|Hong|Taiwan|Singapore|Japan|Korea|India|Thailand|Malaysia|Philippines|Vietnam|Indonesia)/i,
    url: "https://www.gstatic.com/generate_204",
    interval: 300,
    tolerance: 100
  },
  {
    name: "NorthAmerica",
    type: "url-test",
    match: /(美国|美國|加拿大|墨西哥|🇺🇸|🇨🇦|🇲🇽|\bUS\b|\bUSA\b|\bCA\b|United States|America|Canada|Mexico)/i,
    url: "https://www.gstatic.com/generate_204",
    interval: 300,
    tolerance: 100
  },
  {
    name: "Europe",
    type: "url-test",
    match: /(德国|德國|英国|英國|法国|法國|荷兰|荷蘭|瑞士|意大利|義大利|西班牙|芬兰|芬蘭|瑞典|挪威|丹麦|比利时|奥地利|波兰|捷克|葡萄牙|希腊|匈牙利|爱尔兰|俄罗斯|俄羅斯|土耳其|🇩🇪|🇬🇧|🇫🇷|🇳🇱|🇨🇭|🇮🇹|🇪🇸|🇫🇮|🇸🇪|🇳🇴|🇩🇰|🇧🇪|🇦🇹|🇵🇱|🇨🇿|🇵🇹|🇬🇷|🇭🇺|🇮🇪|🇷🇺|🇹🇷|\bDE\b|\bUK\b|\bGB\b|\bFR\b|\bNL\b|\bCH\b|\bIT\b|\bES\b|Germany|Britain|France|Netherlands|Switzerland|Italy|Spain|Finland|Sweden|Norway|Denmark|Belgium|Austria|Poland|Czech|Portugal|Greece|Hungary|Ireland|Russia|Turkey)/i,
    url: "https://www.gstatic.com/generate_204",
    interval: 300,
    tolerance: 100
  }
];

// 规则配置（基于 clashmi.yml 的规则优先级）
const NEW_RULES = [
  // 内网/私有流量
  "GEOSITE,private,DIRECT",
  "GEOIP,private,DIRECT,no-resolve",

  // AI 服务
  "GEOSITE,openai,AI",
  "GEOSITE,anthropic,AI",
  "GEOSITE,google-gemini,AI",
  "DOMAIN-SUFFIX,openai.com,AI",
  "DOMAIN-SUFFIX,chatgpt.com,AI",
  "DOMAIN-SUFFIX,anthropic.com,AI",
  "DOMAIN-SUFFIX,claude.ai,AI",

  // 流媒体
  "GEOSITE,youtube,Media",
  "GEOSITE,netflix,Media",
  "GEOSITE,disney,Media",
  "GEOSITE,spotify,Media",
  "GEOSITE,tiktok,Media",
  "GEOIP,netflix,Media,no-resolve",

  // 通信服务
  "GEOSITE,telegram,Comm",
  "GEOSITE,twitter,Comm",
  "GEOIP,telegram,Comm,no-resolve",
  "GEOIP,twitter,Comm,no-resolve",

  // 云服务
  "GEOSITE,google,Cloud",
  "GEOSITE,github,Cloud",
  "GEOIP,google,Cloud,no-resolve",

  // 金融服务
  "GEOSITE,paypal,Finance",

  // Apple 生态
  "GEOSITE,apple,Apple",
  "GEOIP,apple,Apple,no-resolve",

  // Microsoft 生态
  "GEOSITE,onedrive,Microsoft",
  "GEOSITE,microsoft,Microsoft",

  // 国内直连
  "GEOSITE,cn,Domestic",
  "GEOIP,cn,Domestic,no-resolve"
];

// ======= 核心逻辑（无需修改）=======

const main = (config) => {
  console.log("🚀 FlClash 配置脚本开始执行");

  // 确保关键字段存在
  config.proxies ??= [];
  config["proxy-groups"] ??= [];
  config.rules ??= [];

  const allProxyNames = config.proxies.map(p => p.name);
  const groups = config["proxy-groups"];

  // === 处理代理组 ===
  for (const groupDef of PROXY_GROUPS) {
    let proxies = [];

    if (groupDef.proxies && Array.isArray(groupDef.proxies)) {
      // 直接使用手动列出的 proxies（引用其他组）
      proxies = groupDef.proxies;
    } else if (groupDef.match instanceof RegExp) {
      // 模糊匹配（正则）- 从实际节点中匹配
      proxies = allProxyNames.filter(name => groupDef.match.test(name));

      if (proxies.length === 0) {
        console.log(`⚠️ 代理组 [${groupDef.name}] 未匹配到任何节点`);
        continue;
      }
    }

    const newGroup = {
      name: groupDef.name,
      type: groupDef.type || "select",
      proxies
    };

    // 添加额外属性（url-test 需要）
    if (groupDef.url) newGroup.url = groupDef.url;
    if (groupDef.interval) newGroup.interval = groupDef.interval;
    if (groupDef.tolerance) newGroup.tolerance = groupDef.tolerance;

    // 防止重复添加
    const existingIndex = groups.findIndex(g => g.name === newGroup.name);
    if (existingIndex === -1) {
      groups.push(newGroup);
      console.log(`✅ 添加代理组：${newGroup.name}（${proxies.length} 个代理）`);
    } else {
      // 替换已存在的组
      groups[existingIndex] = newGroup;
      console.log(`🔄 替换代理组：${newGroup.name}（${proxies.length} 个代理）`);
    }
  }

  // === 处理规则 ===
  const rules = config.rules;
  const upperRules = rules.map(r => r.toUpperCase().trim());

  // 插入点：第一个 MATCH / FINAL 规则之前
  let insertIndex = rules.findIndex(r => {
    const u = r.toUpperCase();
    return u.startsWith("MATCH") || u.startsWith("FINAL");
  });

  if (insertIndex === -1) insertIndex = rules.length;

  let addedCount = 0;
  for (const rule of NEW_RULES) {
    const upper = rule.toUpperCase().trim();
    if (!upperRules.includes(upper)) {
      rules.splice(insertIndex, 0, rule);
      insertIndex++;
      addedCount++;
    }
  }

  if (addedCount > 0) {
    console.log(`✅ 添加规则 ${addedCount} 条`);
  } else {
    console.log("⚠️ 无需添加规则（均已存在）");
  }

  console.log("🎉 FlClash 配置更新完成");
  return config;
};

