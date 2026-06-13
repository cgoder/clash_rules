// ============================================================
// 🔧 FlClash 动态配置脚本 v2.0
// 基于 clashmi.yml 转换
//
// ✅ 功能：
// 1. 完全覆盖订阅的规则（清空后重建）
// 2. 添加兜底规则（Final 漏网之鱼）
// 3. 自动创建地区分组和场景策略组
//
// ✅ 使用说明：
// 1️⃣ FlClash：配置 → 覆写 → 脚本模式 → 粘贴此脚本
// 2️⃣ 保存后会清空订阅规则，使用本脚本定义的规则
// 3️⃣ 修改 PROXY_GROUPS 和 RULES 部分自定义配置
// ============================================================

// ======= 用户配置区 =======

// 代理组配置
const PROXY_GROUPS = [
  // === 核心出站组 ===
  {
    name: "Proxy",
    type: "select",
    proxies: ["Auto", "HK", "TW", "SG", "US", "Asia", "NorthAmerica", "Europe", "DIRECT"]
  },

  // === AI 服务组 ===
  {
    name: "AI",
    type: "select",
    proxies: ["US", "NorthAmerica", "Europe", "SG", "HK", "TW", "Asia", "Proxy", "DIRECT"]
  },

  // === 场景服务组 ===
  {
    name: "Media",
    type: "select",
    proxies: ["HK", "TW", "SG", "US", "Asia", "NorthAmerica", "Europe", "Proxy", "DIRECT"]
  },
  {
    name: "Comm",
    type: "select",
    proxies: ["HK", "TW", "SG", "US", "Asia", "NorthAmerica", "Europe", "Proxy", "DIRECT"]
  },
  {
    name: "Cloud",
    type: "select",
    proxies: ["SG", "US", "HK", "TW", "Asia", "NorthAmerica", "Europe", "Proxy", "DIRECT"]
  },
  {
    name: "Finance",
    type: "select",
    proxies: ["US", "NorthAmerica", "Europe", "HK", "SG", "Proxy", "DIRECT"]
  },

  // === 直连优先组 ===
  {
    name: "Apple",
    type: "select",
    proxies: ["DIRECT", "Proxy", "HK", "US", "SG", "Asia", "NorthAmerica"]
  },
  {
    name: "Microsoft",
    type: "select",
    proxies: ["DIRECT", "Proxy", "HK", "US", "SG", "Asia", "NorthAmerica"]
  },
  {
    name: "Domestic",
    type: "select",
    proxies: ["DIRECT", "Proxy"]
  },

  // === 兜底规则（漏网之鱼）===
  {
    name: "Final",
    type: "select",
    proxies: ["Proxy", "DIRECT", "Auto", "HK", "TW", "SG", "US", "Asia", "NorthAmerica", "Europe"]
  },

  // === 自动选择组（正则匹配节点）===
  {
    name: "Auto",
    type: "url-test",
    match: /^(?!.*(剩余流量|距离下次重置|套餐到期|官网|流量|Traffic|Expire|更新|网址)).*$/,
    url: "https://www.gstatic.com/generate_204",
    interval: 300,
    tolerance: 80
  },

  // === 常用地区分组（单独罗列）===
  {
    name: "HK",
    type: "url-test",
    match: /(香港|港|🇭🇰|\bHK\b|\bHKG\b|Hong)/i,
    url: "https://www.gstatic.com/generate_204",
    interval: 300,
    tolerance: 80
  },
  {
    name: "TW",
    type: "url-test",
    match: /(台湾|台灣|🇹🇼|\bTW\b|Taiwan)/i,
    url: "https://www.gstatic.com/generate_204",
    interval: 300,
    tolerance: 80
  },
  {
    name: "SG",
    type: "url-test",
    match: /(新加坡|狮城|🇸🇬|\bSG\b|\bSGP\b|Singapore)/i,
    url: "https://www.gstatic.com/generate_204",
    interval: 300,
    tolerance: 80
  },
  {
    name: "US",
    type: "url-test",
    match: /(美国|美國|🇺🇸|\bUS\b|\bUSA\b|United States|America)/i,
    url: "https://www.gstatic.com/generate_204",
    interval: 300,
    tolerance: 80
  },

  // === 大洲地区分组 ===
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

// 规则配置（完全覆盖订阅规则，按优先级排序）
const RULES = [
  // 第一优先级：内网/私有流量
  "GEOSITE,private,DIRECT",
  "GEOIP,private,DIRECT,no-resolve",

  // 第二优先级：AI 服务
  "GEOSITE,openai,AI",
  "GEOSITE,anthropic,AI",
  "GEOSITE,google-gemini,AI",
  "DOMAIN-SUFFIX,openai.com,AI",
  "DOMAIN-SUFFIX,chatgpt.com,AI",
  "DOMAIN-SUFFIX,anthropic.com,AI",
  "DOMAIN-SUFFIX,claude.ai,AI",

  // 第三优先级：流媒体
  "GEOSITE,youtube,Media",
  "GEOSITE,netflix,Media",
  "GEOSITE,disney,Media",
  "GEOSITE,spotify,Media",
  "GEOSITE,tiktok,Media",
  "GEOIP,netflix,Media,no-resolve",

  // 第四优先级：通信服务
  "GEOSITE,telegram,Comm",
  "GEOSITE,twitter,Comm",
  "GEOIP,telegram,Comm,no-resolve",
  "GEOIP,twitter,Comm,no-resolve",

  // 第五优先级：云服务
  "GEOSITE,google,Cloud",
  "GEOSITE,github,Cloud",
  "GEOIP,google,Cloud,no-resolve",

  // 第六优先级：金融服务
  "GEOSITE,paypal,Finance",

  // 第七优先级：Apple 生态
  "GEOSITE,apple,Apple",
  "GEOIP,apple,Apple,no-resolve",

  // 第八优先级：Microsoft 生态
  "GEOSITE,onedrive,Microsoft",
  "GEOSITE,microsoft,Microsoft",

  // 第九优先级：国内直连
  "GEOSITE,cn,Domestic",
  "GEOIP,cn,Domestic,no-resolve",

  // 兜底规则（漏网之鱼）
  "MATCH,Final"
];

// 是否完全覆盖订阅规则（true=清空订阅规则，false=在订阅规则前插入）
const OVERRIDE_RULES = true;

// ======= 核心逻辑 =======

const main = (config) => {
  console.log("🚀 FlClash 配置脚本 v2.0 开始执行");

  // 确保关键字段存在
  config.proxies ??= [];
  config["proxy-groups"] ??= [];
  config.rules ??= [];

  const allProxyNames = config.proxies.map(p => p.name);
  const groups = config["proxy-groups"];

  console.log(`📦 订阅节点数量: ${allProxyNames.length}`);
  console.log(`📋 订阅策略组数量: ${groups.length}`);
  console.log(`📜 订阅规则数量: ${config.rules.length}`);

  // === 1. 处理代理组 ===
  for (const groupDef of PROXY_GROUPS) {
    let proxies = [];

    if (groupDef.proxies && Array.isArray(groupDef.proxies)) {
      // 直接使用手动列出的 proxies（引用其他组）
      proxies = groupDef.proxies;
    } else if (groupDef.match instanceof RegExp) {
      // 正则匹配 - 从实际节点中筛选
      proxies = allProxyNames.filter(name => groupDef.match.test(name));

      if (proxies.length === 0) {
        console.log(`⚠️  代理组 [${groupDef.name}] 未匹配到任何节点，跳过`);
        continue;
      }
    }

    const newGroup = {
      name: groupDef.name,
      type: groupDef.type || "select",
      proxies
    };

    // 添加额外属性（url-test/load-balance 需要）
    if (groupDef.url) newGroup.url = groupDef.url;
    if (groupDef.interval) newGroup.interval = groupDef.interval;
    if (groupDef.tolerance) newGroup.tolerance = groupDef.tolerance;

    // 查找是否已存在同名组
    const existingIndex = groups.findIndex(g => g.name === newGroup.name);
    if (existingIndex === -1) {
      groups.push(newGroup);
      console.log(`✅ 添加代理组: ${newGroup.name} (${proxies.length} 个代理)`);
    } else {
      // 替换已存在的组
      groups[existingIndex] = newGroup;
      console.log(`🔄 覆盖代理组: ${newGroup.name} (${proxies.length} 个代理)`);
    }
  }

  // === 2. 处理规则 ===
  if (OVERRIDE_RULES) {
    // 完全覆盖模式：清空订阅规则，使用脚本规则
    const oldRulesCount = config.rules.length;
    config.rules = [...RULES];
    console.log(`🔥 完全覆盖模式: 清空订阅的 ${oldRulesCount} 条规则`);
    console.log(`✅ 应用脚本规则: ${RULES.length} 条`);
  } else {
    // 插入模式：在订阅规则前插入脚本规则
    const rules = config.rules;
    const upperRules = rules.map(r => r.toUpperCase().trim());

    // 找到 MATCH/FINAL 的位置
    let matchIndex = rules.findIndex(r => {
      const u = r.toUpperCase();
      return u.startsWith("MATCH") || u.startsWith("FINAL");
    });

    // 如果没有 MATCH/FINAL，插入到末尾
    if (matchIndex === -1) {
      matchIndex = rules.length;
    }

    let addedCount = 0;
    let skippedCount = 0;

    // 从后往前插入（保持顺序）
    for (let i = RULES.length - 1; i >= 0; i--) {
      const rule = RULES[i];
      const upper = rule.toUpperCase().trim();

      // 检查是否已存在
      if (!upperRules.includes(upper)) {
        rules.splice(matchIndex, 0, rule);
        addedCount++;
      } else {
        skippedCount++;
      }
    }

    console.log(`✅ 插入模式: 添加 ${addedCount} 条规则, 跳过 ${skippedCount} 条重复规则`);
  }

  console.log(`📊 最终策略组数量: ${config["proxy-groups"].length}`);
  console.log(`📊 最终规则数量: ${config.rules.length}`);
  console.log("🎉 FlClash 配置更新完成\n");

  return config;
};

