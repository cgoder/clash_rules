/**
 * Clash Meta 配置 JavaScript Override 脚本
 * 基于 clashmi.yml 转换
 * 用于支持 JavaScript override 的代理软件
 */

// ========================================
// 策略组定义
// ========================================
const POLICY = {
  // 核心出站
  PROXY: "一键代理",
  MANUAL: "手动选择",
  DIRECT: "国内直连",

  // 常用地区负载均衡
  HK_LB: "香港负载均衡",
  TW_LB: "台湾负载均衡",
  SG_LB: "新加坡负载均衡",
  JP_LB: "日本负载均衡",
  US_LB: "美国负载均衡",

  // 常用地区速度优先
  HK_UT: "香港速度优先",
  TW_UT: "台湾速度优先",
  SG_UT: "新加坡速度优先",
  JP_UT: "日本速度优先",
  US_UT: "美国速度优先",

  // AI 服务
  CHATGPT: "ChatGPT",
  CLAUDE: "Claude",
  GEMINI: "Gemini",

  // 场景服务
  STREAMING: "流媒体",
  COMMUNICATION: "通信",
  CLOUD: "云服务",
  FINANCE: "金融",

  // 直连优先
  MICROSOFT: "Microsoft",
  ONEDRIVE: "OneDrive",
  APPLE: "Apple",

  // 兜底
  FINAL: "漏网之鱼"
};

// ========================================
// 节点过滤正则表达式（用于策略组）
// ========================================
const NODE_FILTER = {
  // 订阅过滤
  SUBSCRIPTION: /^(?!.*(剩余流量|距离下次重置|套餐到期|去除.*线路|跳转域名|请勿连接)).*$/,

  // 常用地区
  HK: /^(?i)(?=.*(香港|🇭🇰|\bHK\b|\bHKG\b|Hong)).*$/i,
  TW: /^(?i)(?=.*(台湾|台灣|🇹🇼|\bTW\b|Taiwan)).*$/i,
  SG: /^(?i)(?=.*(新加坡|🇸🇬|\bSG\b|\bSGP\b|Singapore)).*$/i,
  JP: /^(?i)(?=.*(日本|🇯🇵|\bJP\b|\bJPN\b|Japan)).*$/i,
  US: /^(?i)(?=.*(美国|美國|🇺🇸|\bUS\b|\bUSA\b|America|United States)).*$/i,

  // 地理分组
  ASIA: /^(?i)(?=.*(香港|台湾|台灣|新加坡|日本|韩国|韓國|印度|泰国|泰國|马来西亚|馬來西亞|菲律宾|菲律賓|越南|印尼|印度尼西亚|🇭🇰|🇹🇼|🇸🇬|🇯🇵|🇰🇷|🇮🇳|🇹🇭|🇲🇾|🇵🇭|🇻🇳|🇮🇩|\bHK\b|\bHKG\b|\bTW\b|\bSG\b|\bSGP\b|\bJP\b|\bJPN\b|\bKR\b|\bKOR\b|\bIN\b|\bTH\b|\bMY\b|\bPH\b|\bVN\b|\bID\b|Hong|Taiwan|Singapore|Japan|Korea|India|Thailand|Malaysia|Philippines|Vietnam|Indonesia)).*$/i,

  EUROPE: /^(?i)(?=.*(德国|德國|英国|英國|法国|法國|荷兰|荷蘭|瑞士|意大利|義大利|西班牙|芬兰|芬蘭|瑞典|挪威|丹麦|比利时|奥地利|波兰|罗马尼亚|羅馬尼亞|捷克|葡萄牙|希腊|匈牙利|爱尔兰|俄罗斯|俄羅斯|土耳其|🇩🇪|🇬🇧|🇫🇷|🇳🇱|🇨🇭|🇮🇹|🇪🇸|🇫🇮|🇸🇪|🇳🇴|🇩🇰|🇧🇪|🇦🇹|🇵🇱|🇷🇴|🇨🇿|🇵🇹|🇬🇷|🇭🇺|🇮🇪|🇷🇺|🇹🇷|\bDE\b|\bUK\b|\bGB\b|\bFR\b|\bNL\b|\bCH\b|\bIT\b|\bES\b|\bFI\b|\bSE\b|\bNO\b|\bDK\b|\bBE\b|\bAT\b|\bPL\b|\bRO\b|\bCZ\b|\bPT\b|\bGR\b|\bHU\b|\bIE\b|\bRU\b|\bTR\b|Germany|Britain|France|Netherlands|Switzerland|Italy|Spain|Finland|Sweden|Norway|Denmark|Belgium|Austria|Poland|Romania|Czech|Portugal|Greece|Hungary|Ireland|Russia|Turkey)).*$/i,

  AMERICA: /^(?i)(?=.*(美国|美國|加拿大|墨西哥|巴西|阿根廷|智利|🇺🇸|🇨🇦|🇲🇽|🇧🇷|🇦🇷|🇨🇱|\bUS\b|\bUSA\b|\bCA\b|\bMX\b|\bBR\b|\bAR\b|\bCL\b|America|United States|Canada|Mexico|Brazil|Argentina|Chile)).*$/i
};

// ========================================
// 域名规则集（精简版，实际使用时需要完整规则）
// ========================================
const DOMAIN_RULES = {
  // 内网/私有
  PRIVATE: [
    'localhost',
    '*.orb.local',
    '*.local',
    '*.lan',
    '*.home.arpa',
    '*.localdomain',
    '*.example',
    '*.invalid',
    '*.test'
  ],

  // AI 服务
  OPENAI: [
    'openai.com',
    '*.openai.com',
    'chat.openai.com',
    'api.openai.com',
    'chatgpt.com',
    '*.chatgpt.com'
  ],

  ANTHROPIC: [
    'anthropic.com',
    '*.anthropic.com',
    'claude.ai',
    '*.claude.ai'
  ],

  GEMINI: [
    'gemini.google.com',
    'ai.google.dev',
    'generativelanguage.googleapis.com'
  ],

  // 流媒体
  YOUTUBE: [
    'youtube.com',
    '*.youtube.com',
    'youtu.be',
    'googlevideo.com',
    '*.googlevideo.com',
    'ytimg.com',
    '*.ytimg.com'
  ],

  NETFLIX: [
    'netflix.com',
    '*.netflix.com',
    'nflxext.com',
    '*.nflxext.com',
    'nflximg.com',
    '*.nflximg.com',
    'nflxvideo.net',
    '*.nflxvideo.net'
  ],

  TIKTOK: [
    'tiktok.com',
    '*.tiktok.com',
    'tiktokcdn.com',
    '*.tiktokcdn.com',
    'tiktokv.com',
    '*.tiktokv.com'
  ],

  DISNEY: [
    'disney.com',
    '*.disney.com',
    'disneyplus.com',
    '*.disneyplus.com'
  ],

  SPOTIFY: [
    'spotify.com',
    '*.spotify.com',
    'scdn.co',
    '*.scdn.co'
  ],

  APPLETV: [
    'tv.apple.com',
    '*.tv.apple.com'
  ],

  // 通信
  TELEGRAM: [
    'telegram.org',
    '*.telegram.org',
    't.me',
    'telegram.me',
    'tx.me',
    'tdesktop.com',
    'telegra.ph',
    'telesco.pe'
  ],

  TWITTER: [
    'twitter.com',
    '*.twitter.com',
    'x.com',
    '*.x.com',
    'twimg.com',
    '*.twimg.com',
    't.co'
  ],

  // 云服务
  GOOGLE: [
    'google.com',
    '*.google.com',
    'googleapis.com',
    '*.googleapis.com',
    'gstatic.com',
    '*.gstatic.com'
  ],

  GITHUB: [
    'github.com',
    '*.github.com',
    'githubusercontent.com',
    '*.githubusercontent.com',
    'github.io',
    '*.github.io'
  ],

  SPEEDTEST: [
    'speedtest.net',
    '*.speedtest.net',
    'ooklaserver.net',
    '*.ooklaserver.net'
  ],

  // 金融
  PAYPAL: [
    'paypal.com',
    '*.paypal.com',
    'paypalobjects.com',
    '*.paypalobjects.com'
  ],

  // Apple
  APPLE: [
    'apple.com',
    '*.apple.com',
    'icloud.com',
    '*.icloud.com',
    'apple-cloudkit.com',
    '*.apple-cloudkit.com',
    'cdn-apple.com',
    '*.cdn-apple.com'
  ],

  // Microsoft
  ONEDRIVE: [
    '1drv.com',
    '*.1drv.com',
    'onedrive.com',
    '*.onedrive.com',
    'onedrive.live.com',
    'storage.live.com'
  ],

  MICROSOFT: [
    'microsoft.com',
    '*.microsoft.com',
    'windows.com',
    '*.windows.com',
    'microsoftonline.com',
    '*.microsoftonline.com',
    'office.com',
    '*.office.com',
    'office365.com',
    '*.office365.com'
  ],

  // 国内
  CN: [
    '*.cn',
    'baidu.com',
    '*.baidu.com',
    'qq.com',
    '*.qq.com',
    'taobao.com',
    '*.taobao.com',
    'tmall.com',
    '*.tmall.com',
    'alipay.com',
    '*.alipay.com',
    'alibaba.com',
    '*.alibaba.com',
    'jd.com',
    '*.jd.com',
    'bilibili.com',
    '*.bilibili.com',
    'weibo.com',
    '*.weibo.com',
    'douyin.com',
    '*.douyin.com'
  ]
};

// ========================================
// IP 规则集（CIDR 格式）
// ========================================
const IP_RULES = {
  PRIVATE: [
    '0.0.0.0/8',
    '10.0.0.0/8',
    '100.64.0.0/10',
    '127.0.0.0/8',
    '169.254.0.0/16',
    '172.16.0.0/12',
    '192.0.0.0/24',
    '192.0.2.0/24',
    '192.168.0.0/16',
    '198.18.0.0/15',
    '198.51.100.0/24',
    '203.0.113.0/24',
    '224.0.0.0/4',
    '233.252.0.0/24',
    '240.0.0.0/4',
    '255.255.255.255/32'
  ],

  CN: [
    '1.0.0.0/8',
    '14.0.0.0/8',
    '27.0.0.0/8',
    '36.0.0.0/8',
    '39.0.0.0/8',
    '42.0.0.0/8',
    '49.0.0.0/8',
    '58.0.0.0/8',
    '59.0.0.0/8',
    '60.0.0.0/8',
    '61.0.0.0/8',
    '101.0.0.0/8',
    '103.0.0.0/8',
    '106.0.0.0/8',
    '110.0.0.0/8',
    '111.0.0.0/8',
    '112.0.0.0/8',
    '113.0.0.0/8',
    '114.0.0.0/8',
    '115.0.0.0/8',
    '116.0.0.0/8',
    '117.0.0.0/8',
    '118.0.0.0/8',
    '119.0.0.0/8',
    '120.0.0.0/8',
    '121.0.0.0/8',
    '122.0.0.0/8',
    '123.0.0.0/8',
    '124.0.0.0/8',
    '125.0.0.0/8',
    '175.0.0.0/8',
    '180.0.0.0/8',
    '182.0.0.0/8',
    '183.0.0.0/8',
    '202.0.0.0/8',
    '203.0.0.0/8',
    '210.0.0.0/8',
    '211.0.0.0/8',
    '218.0.0.0/8',
    '219.0.0.0/8',
    '220.0.0.0/8',
    '221.0.0.0/8',
    '222.0.0.0/8',
    '223.0.0.0/8'
  ]
};

// ========================================
// 工具函数
// ========================================

/**
 * 域名匹配（支持通配符）
 */
function domainMatch(domain, pattern) {
  domain = domain.toLowerCase();
  pattern = pattern.toLowerCase();

  // 精确匹配
  if (pattern === domain) return true;

  // 通配符匹配 *.example.com
  if (pattern.startsWith('*.')) {
    const suffix = pattern.substring(2);
    return domain === suffix || domain.endsWith('.' + suffix);
  }

  // 后缀匹配 .example.com
  if (pattern.startsWith('.')) {
    return domain.endsWith(pattern);
  }

  return false;
}

/**
 * 检查域名是否在规则列表中
 */
function matchDomainList(domain, ruleList) {
  if (!domain || !ruleList) return false;

  for (const pattern of ruleList) {
    if (domainMatch(domain, pattern)) {
      return true;
    }
  }
  return false;
}

/**
 * IP 地址转为整数（用于 CIDR 匹配）
 */
function ipToInt(ip) {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;

  let result = 0;
  for (let i = 0; i < 4; i++) {
    const num = parseInt(parts[i]);
    if (isNaN(num) || num < 0 || num > 255) return null;
    result = (result << 8) + num;
  }
  return result;
}

/**
 * CIDR 匹配
 */
function matchCIDR(ip, cidr) {
  const [network, maskLen] = cidr.split('/');
  const ipInt = ipToInt(ip);
  const networkInt = ipToInt(network);

  if (ipInt === null || networkInt === null) return false;

  const mask = (~0 << (32 - parseInt(maskLen))) >>> 0;
  return (ipInt & mask) === (networkInt & mask);
}

/**
 * 检查 IP 是否在 CIDR 列表中
 */
function matchIPList(ip, cidrList) {
  if (!ip || !cidrList) return false;

  for (const cidr of cidrList) {
    if (matchCIDR(ip, cidr)) {
      return true;
    }
  }
  return false;
}

/**
 * URL 匹配（支持关键词）
 */
function urlMatch(url, keyword) {
  return url.toLowerCase().includes(keyword.toLowerCase());
}

// ========================================
// 主要路由函数
// ========================================

/**
 * 根据 URL 和目标 IP 返回代理策略
 * @param {string} url - 请求的完整 URL
 * @param {string} host - 目标主机名
 * @param {string} ip - 目标 IP 地址（可选）
 * @returns {string} - 策略名称
 */
function route(url, host, ip) {
  // 提取域名
  let domain = host;
  if (!domain && url) {
    try {
      const urlObj = new URL(url);
      domain = urlObj.hostname;
    } catch (e) {
      // URL 解析失败
    }
  }

  // 第一优先级：内网/私有流量
  if (domain && matchDomainList(domain, DOMAIN_RULES.PRIVATE)) {
    return POLICY.DIRECT;
  }
  if (ip && matchIPList(ip, IP_RULES.PRIVATE)) {
    return POLICY.DIRECT;
  }

  // 第二优先级：自定义本地规则
  // 注意：my_proxy 和 my_direct 需要根据实际规则文件实现
  // 这里省略，实际使用时需要添加

  // 第三优先级：AI 业务
  if (domain) {
    if (matchDomainList(domain, DOMAIN_RULES.OPENAI)) {
      return POLICY.CHATGPT;
    }
    if (matchDomainList(domain, DOMAIN_RULES.ANTHROPIC)) {
      return POLICY.CLAUDE;
    }
    if (matchDomainList(domain, DOMAIN_RULES.GEMINI)) {
      return POLICY.GEMINI;
    }
  }

  // 第四优先级：流媒体服务
  if (domain) {
    if (matchDomainList(domain, DOMAIN_RULES.YOUTUBE) ||
        matchDomainList(domain, DOMAIN_RULES.NETFLIX) ||
        matchDomainList(domain, DOMAIN_RULES.TIKTOK) ||
        matchDomainList(domain, DOMAIN_RULES.DISNEY) ||
        matchDomainList(domain, DOMAIN_RULES.SPOTIFY) ||
        matchDomainList(domain, DOMAIN_RULES.APPLETV)) {
      return POLICY.STREAMING;
    }
  }

  // 第五优先级：通信服务
  if (domain) {
    if (matchDomainList(domain, DOMAIN_RULES.TELEGRAM) ||
        matchDomainList(domain, DOMAIN_RULES.TWITTER)) {
      return POLICY.COMMUNICATION;
    }
  }

  // 第六优先级：云服务
  if (domain) {
    if (matchDomainList(domain, DOMAIN_RULES.GOOGLE) ||
        matchDomainList(domain, DOMAIN_RULES.GITHUB) ||
        matchDomainList(domain, DOMAIN_RULES.SPEEDTEST)) {
      return POLICY.CLOUD;
    }
  }

  // 第七优先级：金融服务
  if (domain && matchDomainList(domain, DOMAIN_RULES.PAYPAL)) {
    return POLICY.FINANCE;
  }

  // 第八优先级：Apple 生态
  if (domain && matchDomainList(domain, DOMAIN_RULES.APPLE)) {
    return POLICY.APPLE;
  }

  // 第九优先级：Microsoft 生态
  if (domain) {
    if (matchDomainList(domain, DOMAIN_RULES.ONEDRIVE)) {
      return POLICY.ONEDRIVE;
    }
    if (matchDomainList(domain, DOMAIN_RULES.MICROSOFT)) {
      return POLICY.MICROSOFT;
    }
  }

  // 第十优先级：国内直连加速
  if (domain && matchDomainList(domain, DOMAIN_RULES.CN)) {
    return POLICY.DIRECT;
  }
  if (ip && matchIPList(ip, IP_RULES.CN)) {
    return POLICY.DIRECT;
  }

  // 兜底规则
  return POLICY.FINAL;
}

// ========================================
// 导出函数（根据不同代理软件格式调整）
// ========================================

/**
 * Surge 格式导出
 */
function surge_policy(url, host) {
  return route(url, host, null);
}

/**
 * Quantumult X 格式导出
 */
function policy_select(url, host) {
  return route(url, host, null);
}

/**
 * Shadowrocket 格式导出
 */
function shadowrocket_policy(url, host) {
  return route(url, host, null);
}

/**
 * 通用导出
 */
function main(params) {
  const url = params.url || '';
  const host = params.host || params.hostname || '';
  const ip = params.ip || params.dstAddr || '';

  return route(url, host, ip);
}

// ========================================
// 节点过滤函数（用于策略组）
// ========================================

/**
 * 过滤节点列表
 * @param {Array} proxies - 节点列表
 * @param {RegExp} filter - 过滤正则
 * @returns {Array} - 过滤后的节点列表
 */
function filterProxies(proxies, filter) {
  if (!proxies || !Array.isArray(proxies)) return [];
  return proxies.filter(proxy => {
    const name = typeof proxy === 'string' ? proxy : proxy.name;
    return filter.test(name);
  });
}

/**
 * 获取香港节点
 */
function getHKProxies(proxies) {
  return filterProxies(proxies, NODE_FILTER.HK);
}

/**
 * 获取台湾节点
 */
function getTWProxies(proxies) {
  return filterProxies(proxies, NODE_FILTER.TW);
}

/**
 * 获取新加坡节点
 */
function getSGProxies(proxies) {
  return filterProxies(proxies, NODE_FILTER.SG);
}

/**
 * 获取日本节点
 */
function getJPProxies(proxies) {
  return filterProxies(proxies, NODE_FILTER.JP);
}

/**
 * 获取美国节点
 */
function getUSProxies(proxies) {
  return filterProxies(proxies, NODE_FILTER.US);
}

/**
 * 获取亚洲节点
 */
function getAsiaProxies(proxies) {
  return filterProxies(proxies, NODE_FILTER.ASIA);
}

/**
 * 获取欧洲节点
 */
function getEuropeProxies(proxies) {
  return filterProxies(proxies, NODE_FILTER.EUROPE);
}

/**
 * 获取美洲节点
 */
function getAmericaProxies(proxies) {
  return filterProxies(proxies, NODE_FILTER.AMERICA);
}

// ========================================
// 使用说明
// ========================================

/**
 * 使用方法：
 *
 * 1. Surge 配置示例：
 *    [Script]
 *    policy-override = type=rule,script-path=clashmi_override.js
 *
 * 2. Quantumult X 配置示例：
 *    [filter_local]
 *    final, script:clashmi_override.js
 *
 * 3. Shadowrocket 配置示例：
 *    [Script]
 *    policy-select = script-path=clashmi_override.js, type=policy
 *
 * 4. 自定义规则：
 *    - 修改 DOMAIN_RULES 添加自定义域名规则
 *    - 修改 IP_RULES 添加自定义 IP 规则
 *    - 修改 route() 函数调整规则优先级
 *
 * 5. 节点过滤：
 *    - 使用 getHKProxies() 等函数过滤特定地区节点
 *    - 在策略组配置中使用这些函数
 */
