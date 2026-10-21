// 由 clash.js 生成与之一致的 clashmi.yml（策略组 / 规则 / 规则集三层对齐）
// 运行：node temp/scripts/gen_clashmi.mjs > clashmi.yml
//
// 设计约束：
//  1. clashmi.yml 是静态 YAML，客户端会把节点注入进来（inject），
//     因此所有地区组用 include-all + filter 复刻 clash.js 的 classifyNode 行为。
//  2. 组名、规则顺序、规则集命名、健康检查参数全部取自 clash.js 的常量，
//     保证两份配置的路由语义一致。
//  3. TUN / DNS / sniffer / 端口等「客户端自管」项无法从 clash.js 继承
//     （clash.js 默认不接管这些），保留 standalone 必需的本机设置。

import fs from 'node:fs';
import vm from 'node:vm';

const src = fs.readFileSync(new URL('../clash.js', import.meta.url), 'utf8');
const sb = { console: { log() {} } };
vm.createContext(sb);
new vm.Script(src + '\n;__a={main,GROUP_BASE_OPTION,SELECT_BASE_OPTION,UT_BASE,FALLBACK_BASE,DIRECT_PROXIES,ICON,REGION_DEFINITIONS,SERVICE_CONFIGS,BASE_RULE_PROVIDERS};')
  .runInContext(sb);
const A = sb.__a;

// 用一份合成订阅跑 main()，取得与 clash.js 完全相同的组/规则/规则集骨架
const mk = n => ({ name: n, type: 'ss', server: 'a.example.com', port: 443, cipher: 'aes-128-gcm', password: 'x' });
const probe = A.main({
  proxies: [mk('香港 01'), mk('日本 01'), mk('美国 01')],
  'proxy-groups': [], rules: [],
});

// ---------- 地区 filter 正则 ----------
// clash.js 的 classifyNode 是「单一归属」：国旗 > 无歧义国家码 > 定义顺序。
// 静态 YAML 的各组 filter 彼此独立、无法做跨组仲裁，因此用「首位非他国国旗」的
// 负向先行断言来近似国旗优先，再叠加本地区标识。
const FLAGS = Object.fromEntries(A.REGION_DEFINITIONS.map(r => [r.code, r.flag]));
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// clash.js 的地区正则可直接复用：它已包含中文别名、emoji 与国家码，
// 只需把它包进「整串匹配」的外壳。负向先行断言放在最前，用来近似「单一归属」：
// 名称首位若是别国国旗，就不进本组（对应 classifyNode 的国旗优先规则）。
function buildFilter(def) {
  const inner = def.re.source;                       // 形如 (香港|🇭🇰|(?<![A-Za-z])(?:HK|HKG)(?![A-Za-z])|hong\s*kong)
  const foreign = A.REGION_DEFINITIONS.filter(r => r.code !== def.code).map(r => esc(r.flag)).join('|');
  return `^(?i)(?!(?:${foreign}))(?=.*${inner}).*$`;
}

// 其他节点：不含任何 10 大地区标记的节点
const OTHER_FILTER = (() => {
  const any = A.REGION_DEFINITIONS.map(d => d.re.source).join('|');
  return `^(?i)(?!.*(?:${any})).*$`;
})();

// ---------- YAML 输出 ----------
const q = s => `'${String(s).replace(/'/g, "''")}'`;
const lines = [];
const P = s => lines.push(s);

P('# ============================================================');
P('# clashmi.yml — 与 clash.js 逻辑对齐的静态配置');
P('#');
P('# ⚠️ 本文件由 clash.js 的常量派生，请勿单独修改路由逻辑；');
P('#    两边的组名、规则顺序、规则集命名、健康检查参数必须保持一致。');
P('#    一致性由 scripts/check_config_sync.mjs 校验。');
P('#');
P('# 与 clash.js 的唯一固有差异（静态 YAML 的能力边界）：');
P('#   1. 节点由客户端注入，本文件不含任何订阅链接或节点凭据。');
P('#   2. clash.js 会把与内置名（DIRECT/REJECT 等）冲突的节点自动改名；');
P('#      静态 YAML 做不到，订阅里若出现这类节点名，内核会报 duplicate name。');
P('# ============================================================');
P('');
P('# ---------- 基础设置（standalone 必需，clash.js 默认交由客户端控制）----------');
P(`mixed-port: 7893`);
P('mode: rule');
P('allow-lan: true');
P('bind-address: "*"');
P('tcp-concurrent: true');
P('unified-delay: true   # 与 clash.js 的 ENSURE_UNIFIED_DELAY 对齐：剥离 https 测速握手开销');
P('log-level: warning');
P('ipv6: false');
P('profile:');
P('  store-selected: true');
P('  store-fake-ip: true');
P('');
P('# 管理面板');
P('external-ui-name: zashboard');
P('external-ui: ui');
P('external-controller: 127.0.0.1:9090');
P('secret: ""');
P('external-ui-url: https://v4.gh-proxy.org/https://github.com/Zephyruso/zashboard/releases/latest/download/dist-no-fonts.zip');
P('');
P('# TUN（SideStore / LiveContainer 免电脑续签依赖，勿删）');
P('tun:');
P('  enable: true');
P('  stack: gvisor');
P('  mtu: 1300');
P("  dns-hijack: ['any:53', 'tcp://any:53']");
P('  auto-detect-interface: true');
P('  auto-route: true');
P('  auto-redirect: true');
P('  strict-route: false');
P('  endpoint-independent-nat: true');
P('  route-exclude-address:      # 注意：键名是 route-exclude-address，不是 route-exclude-cidr');
P('    - 192.168.0.0/16');
P('    - 172.16.0.0/12');
P('    - 100.64.0.0/10');
P('    - 169.254.0.0/16');
P('    - fc00::/7');
P('    - fe80::/10');
P('    # 10.0.0.0/8 与 10.7.0.0/24 必须排除在列表外，否则 10.7.0.1 会被移出 TUN，续签失效');
P('  loopback-address:');
P('    - 10.7.0.1');
P('');
P('# 嗅探');
P('sniffer:');
P('  enable: true');
P('  override-destination: true');
P('  parse-pure-ip: true');
P('  force-dns-mapping: true');
P('  sniff:');
P('    QUIC: {ports: [443, 8443]}');
P('    TLS: {ports: [443, 8443]}');
P('    HTTP: {ports: [80, 8080-8880], override-destination: true}');
P('  force-domain:');
for (const d of ['+.netflix.com', '+.nflxvideo.net', '+.googlevideo.com', '+.youtube.com', '+.telegram.org', '+.t.me', '+.twitter.com', '+.twimg.com', '+.tiktok.com', '+.amazonaws.com']) P(`    - "${d}"`);
P('  skip-domain:');
for (const d of ['+.apple.com', 'Mijia Cloud', 'dlg.io.mi.com', '+.oray.com', '+.sunlogin.net']) P(`    - "${d}"`);
P('');
P('# DNS：保留 standalone 的防污染方案，nameserver-policy 指向与 clash.js 同名的组');
P('dns:');
P('  enable: true');
P('  ipv6: false');
P('  listen: 0.0.0.0:7874');
P('  cache: {enable: true, size: 4096, expired: 3600}');
P('  enhanced-mode: fake-ip');
P('  prefer-h3: false');
P('  fake-ip-range: 198.18.0.1/16');
P('  fake-ip-filter-mode: blacklist');
P('  fake-ip-filter:');
P("    - 'rule-set:private_domain'");
P("    - 'rule-set:fakeip_filter'");
P("    - '+.orb.local'");
P("    - 'localhost'");
P("    - '*.home.arpa'");
P("    - 'time.*.com'");
P("    - 'ntp.*.com'");
P("    - '+.ntp.org'");
P("    - '+.pool.ntp.org'");
P("    - 'captive.apple.com'");
P("    - 'connectivitycheck.gstatic.com'");
P("    - '+.msftconnecttest.com'");
P("    - '+.msftncsi.com'");
P("    - 'stun.*.*'");
P("    - '+.stun.playstation.net'");
P("    - '+.xboxlive.com'");
P("    - '+.speedtest.net'");
P('  use-hosts: false');
P('  use-system-hosts: false');
P('  default-nameserver: [223.5.5.5, 119.29.29.29]');
P('  proxy-server-nameserver:');
P("    - 'https://223.5.5.5/dns-query#DIRECT'");
P("    - 'https://doh.pub/dns-query#DIRECT'");
P('    - 223.5.5.5');
P('    - 119.29.29.29');
P('    - system');
P('  nameserver:');
P("    - 'https://doh.pub/dns-query'");
P("    - 'https://dns.alidns.com/dns-query'");
P('  nameserver-policy:');
P('    "rule-set:geolocation_not_cn": &proxy_dns');
P(`      - "https://1.1.1.1/dns-query#${'默认代理'}"`);
P(`      - "https://8.8.8.8/dns-query#${'默认代理'}"`);
P('    "rule-set:my_proxy": *proxy_dns');
P('    "+.orb.local": system');
P('');
P('# ============================================================');
P('# 代理（仅脚本注入的直连代理；真实节点由客户端注入）');
P('# ============================================================');
P('proxies:');
for (const p of A.DIRECT_PROXIES) {
  P(`  - {name: ${q(p.name)}, type: ${p.type}, ip-version: ${p['ip-version']}}`);
}
P('');
P('# ============================================================');
P('# 策略组（组名与结构与 clash.js buildProxyGroups 一一对应）');
P('# ============================================================');

// 输出 select 组的公共键（与 clash.js SELECT_BASE_OPTION 完全一致）
function emitSelectBase() {
  for (const [k, v] of Object.entries(S)) {
    P(`    ${k}: ${typeof v === 'string' ? q(v) : v}`);
  }
}

const G = A.GROUP_BASE_OPTION;
const S = A.SELECT_BASE_OPTION;
const U = A.UT_BASE;
const F = A.FALLBACK_BASE;

P('proxy-groups:');
P('  # ---- 顶层全局入口（clash.js 会显式定义 GLOBAL 并指定默认出口）----');
P('  - name: GLOBAL');
P('    type: select');
P(`    proxies: [${['默认代理', ...probe['proxy-groups'].filter(g => g.name !== 'GLOBAL' && g.name !== '默认代理').map(g => g.name)].join(', ')}]`);
emitSelectBase();
P('    icon: \'' + A.ICON.Proxy + '\'');
P('    default-selected: 默认代理');
P('');
P('  # ---- 核心三大组 ----');
P('  - name: 国内直连');
P('    type: select');
P(`    proxies: [${A.DIRECT_PROXIES.map(p => q(p.name)).join(', ')}]`);
emitSelectBase();
P('    hidden: true');
P('    icon: \'' + A.ICON.China + '\'');
P('');
P('  - name: 手动选择');
P('    type: select');
const regionNames = A.REGION_DEFINITIONS.map(r => r.name);
P(`    proxies: [${[...regionNames, '其他节点'].join(', ')}]`);
emitSelectBase();
P('    icon: \'' + A.ICON.Manual + '\'');
P('');
P('  - name: 默认代理');
P('    type: select');
P(`    proxies: [${[...regionNames, '其他节点', '兜底自动选择'].join(', ')}]`);
emitSelectBase();
P('    icon: \'' + A.ICON.Proxy + '\'');
P('');
P('  # ---- 地区组（url-test 区内测速，exclude-type 排除 direct 代理）----');
for (const r of A.REGION_DEFINITIONS) {
  const f = buildFilter(r);
  P(`  - name: ${r.name}-自动选择`);
  P('    type: url-test');
  P(`    tolerance: ${U.tolerance}`);
  P(`    interval: ${U.interval}`);
  P(`    timeout: ${U.timeout}`);
  P(`    url: ${q(U.url)}`);
  P(`    lazy: ${U.lazy}`);
  P(`    max-failed-times: ${U['max-failed-times']}`);
  P(`    empty-fallback: ${U['empty-fallback']}`);
  P('    exclude-type: DIRECT');
  P('    include-all: true');
  P(`    filter: ${q(f)}`);
  P('    hidden: true');
  P(`    icon: '${r.icon}'`);
  P('');
  P(`  - name: ${r.name}`);
  P('    type: select');
  P(`    proxies: [${r.name}-自动选择, 兜底自动选择]`);
  P(`    include-all: true`);
  P(`    filter: ${q(f)}`);
  P('    exclude-type: DIRECT');
  emitSelectBase();
  P(`    icon: '${r.icon}'`);
  P('');
}
P('  # ---- 其他节点（10 大地区之外的有效节点）----');
P('  - name: 其他节点');
P('    type: select');
P(`    include-all: true`);
P(`    filter: ${q(OTHER_FILTER)}`);
P('    exclude-type: DIRECT');
emitSelectBase();
P('    icon: \'' + A.ICON.Other + '\'');
P('');
P('  # ---- 7 大指定场景组 ----');
const svcDefault = {};
for (const g of probe['proxy-groups']) {
  if (g['default-selected']) svcDefault[g.name] = g['default-selected'];
}
// 成员列表直接从 clash.js 的产出里取，避免两边各自维护一份而漂移
for (const svc of A.SERVICE_CONFIGS) {
  const g = svc.group;
  // 组的类型、成员、默认值全部以 clash.js 实际产出为准，生成器只负责序列化。
  const real = probe['proxy-groups'].find(x => x.name === g.name) || {};
  const members = real.proxies || [];
  P(`  - name: ${g.name}`);
  P(`    type: ${real.type || 'select'}`);
  P(`    proxies: [${members.join(', ')}]`);
  if (real.type === 'fallback') {
    // fallback 组：默认出口由成员顺序决定，不写 default-selected
    for (const k of ['interval', 'timeout', 'url', 'lazy', 'max-failed-times', 'empty-fallback', 'exclude-type', 'hidden']) {
      const v = real[k];
      if (v === undefined) continue;
      P(`    ${k}: ${typeof v === 'string' && k === 'url' ? q(v) : v}`);
    }
  } else {
    emitSelectBase();
    if (real['default-selected']) P(`    default-selected: ${real['default-selected']}`);
  }
  P(`    icon: '${g.icon}'`);
  P('');
}
P('  # ---- 兜底 ----');
P('  - name: 漏网之鱼');
P('    type: select');
P('    proxies: [默认代理, 手动选择, 国内直连, 兜底自动选择]');
emitSelectBase();
P('    icon: \'' + A.ICON.MATCH + '\'');
P('    default-selected: 默认代理');
P('');
P('  - name: 兜底自动选择');
P('    type: fallback');
P(`    interval: ${F.interval}`);
P(`    timeout: ${F.timeout}`);
P(`    url: ${q(F.url)}`);
P(`    lazy: ${F.lazy}`);
P(`    max-failed-times: ${F['max-failed-times']}`);
P(`    empty-fallback: ${F['empty-fallback']}`);
P('    exclude-type: DIRECT');
P('    include-all: true');
P('    hidden: true');
P('');
P('# ============================================================');
P('# 规则（顺序与 clash.js buildRules 完全一致）');
P('# ============================================================');
P('rules:');
for (const r of probe.rules) P(`  - ${r}`);
P('');
P('# ============================================================');
P('# 规则来源（与 clash.js BASE_RULE_PROVIDERS + SERVICE_CONFIGS 一致）');
P('# ============================================================');
P('rule-providers:');
const providers = { ...A.BASE_RULE_PROVIDERS };
for (const svc of A.SERVICE_CONFIGS) Object.assign(providers, svc.providers);
delete providers.adblock; // clash.js 在 AdBlock=false 时会删除该规则集
for (const [name, p] of Object.entries(providers)) {
  P(`  ${name}:`);
  P(`    type: ${p.type}`);
  P(`    interval: ${p.interval}`);
  P(`    behavior: ${p.behavior}`);
  P(`    format: ${p.format}`);
  P(`    url: ${q(p.url)}`);
}

process.stdout.write(lines.join('\n') + '\n');
