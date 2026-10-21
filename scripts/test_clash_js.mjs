// clash.js 回归测试
//
// 每个用例对应一个曾经真实出现、并经 mihomo 实测确认的缺陷；
// 修改 clash.js 的节点治理 / 策略组逻辑后应先跑本文件。
//
// 用法：
//   node scripts/test_clash_js.mjs              仅跑逻辑断言
//   MIHOMO=1 node scripts/test_clash_js.mjs     额外调用 mihomo -t 做内核级校验
//
// 依赖：Node.js 18+；MIHOMO=1 时需要 PATH 中有 mihomo 可执行文件。
// 退出码：0 全部通过，1 存在失败用例。

import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';

const repo = path.resolve(import.meta.dirname, '..');
const SRC = fs.readFileSync(path.join(repo, 'clash.js'), 'utf8');

function load() {
  const sb = { console: { log() {} } };
  vm.createContext(sb);
  new vm.Script(SRC + '\n;__api={main,OPTIONS,ruleOptionsEnable,classifyNode,REGION_DEFINITIONS};', { filename: 'clash.js' })
    .runInContext(sb);
  return sb.__api;
}
const mk = (name, extra = {}) => ({ name, type: 'ss', server: 'a.example.com', port: 443, cipher: 'aes-128-gcm', password: 'x', ...extra });
const run = (proxies, extra = {}, opts = {}, sw = {}) => {
  const api = load();
  Object.assign(api.OPTIONS, opts);
  Object.assign(api.ruleOptionsEnable, sw);
  return { out: api.main({ proxies, 'proxy-groups': [], rules: [], ...extra }), api };
};
const groupsOf = (out, name) => out['proxy-groups'].filter(g => g.name === name);

// ---- 简易 YAML（够 mihomo -t 解析） ----
function yaml(v, indent = 0) {
  const pad = '  '.repeat(indent);
  if (v === null) return 'null';
  if (Array.isArray(v)) {
    if (!v.length) return '[]';
    return v.map(i => (i && typeof i === 'object')
      ? `${pad}- ${yaml(i, indent + 1).replace(/^\s+/, '')}`
      : `${pad}- ${JSON.stringify(i)}`).join('\n');
  }
  if (typeof v === 'object') {
    return Object.entries(v).map(([k, val]) => (val && typeof val === 'object')
      ? `${pad}${k}:\n${yaml(val, indent + 1)}`
      : `${pad}${k}: ${JSON.stringify(val)}`).join('\n');
  }
  return `${pad}${JSON.stringify(v)}`;
}

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'clash-p0-'));
function mihomoTest(label, cfg) {
  const file = path.join(tmpDir, `${label}.yml`);
  fs.writeFileSync(file, yaml(cfg) + '\n');
  try {
    const out = execFileSync('mihomo', ['-t', '-f', file, '-d', tmpDir], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return { ok: /test is successful/.test(out), msg: out.trim().split('\n').pop() };
  } catch (e) {
    const combined = `${e.stdout || ''}${e.stderr || ''}`;
    const err = combined.split('\n').find(l => /level=error|level=fatal/.test(l)) || combined.trim();
    return { ok: false, msg: err.slice(0, 400) };
  }
}

const results = [];
const check = (id, title, fn) => {
  try {
    const detail = fn();
    results.push({ id, title, pass: true, detail });
  } catch (e) {
    results.push({ id, title, pass: false, detail: e.message });
  }
};
const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

// ============================================================
// P0-1 分流组添加所有节点：default-selected 必须仍是组内真实成员
// ============================================================
check('P0-1', '分流组添加所有节点：场景组 default-selected 落在成员内', () => {
  const { out } = run([mk('🇭🇰 香港 01'), mk('🇯🇵 日本 01'), mk('🇺🇸 美国 01')], {}, {}, { 分流组添加所有节点: true });
  const bad = out['proxy-groups'].filter(g => g['default-selected'] && !g.proxies.includes(g['default-selected']));
  assert(bad.length === 0, `default-selected 不在成员内: ${bad.map(g => `${g.name}→${g['default-selected']}`).join(', ')}`);
  // 语义也要对：Microsoft / Apple 仍应默认直连；AI 是 fallback 组，
  // 其默认出口由成员顺序决定（首个成员），而非 default-selected。
  const pick = n => out['proxy-groups'].find(g => g.name === n)?.['default-selected'];
  assert(pick('Microsoft') === '国内直连', `Microsoft 默认应为「国内直连」，实际 ${pick('Microsoft')}`);
  assert(pick('Apple') === '国内直连', `Apple 默认应为「国内直连」，实际 ${pick('Apple')}`);
  const ai = out['proxy-groups'].find(g => g.name === 'AI');
  assert(ai.type === 'fallback', `AI 组应为 fallback，实际 ${ai.type}`);
  assert(ai.proxies[0] === '美国-自动选择', `AI 首选成员应为「美国-自动选择」，实际 ${ai.proxies[0]}`);
  assert(!ai['default-selected'], 'AI 作为 fallback 组不应设置 default-selected（易与成员顺序不一致）');
  return 'Microsoft/Apple→国内直连，AI fallback 首选美国-自动选择，全部落位';
});

// ============================================================
// P0-2 节点改名后必须同步改写 dialer-proxy 引用
// ============================================================
check('P0-2', '节点改名后 dialer-proxy 引用同步改写成新名', () => {
  const { out } = run([mk('香港'), mk('中转', { 'dialer-proxy': '香港' }), mk('DIRECT', { 'dialer-proxy': '香港' })]);
  const names = out.proxies.map(p => p.name);
  const relay = out.proxies.find(p => p.name === '中转');
  assert(relay, '中转节点丢失');
  assert(relay['dialer-proxy'] !== '香港', 'dialer-proxy 仍指向旧名「香港」');
  assert(names.includes(relay['dialer-proxy']), `dialer-proxy 指向不存在的节点: ${relay['dialer-proxy']}`);
  const renamedHk = names.find(n => n.includes('香港') && n !== 'DIRECT | 仅IPv4');
  assert(relay['dialer-proxy'] === renamedHk, `dialer-proxy=${relay['dialer-proxy']} 与改名结果 ${renamedHk} 不一致`);
  return `香港 → ${renamedHk}，dialer-proxy 已跟随`;

  // 链式引用（A→B→C）也要级联改名，见 P0-2b
});

check('P0-2b', '链式 dialer-proxy（A→B→C）级联改名', () => {
  const { out } = run([mk('香港'), mk('B', { 'dialer-proxy': '香港' }), mk('C', { 'dialer-proxy': 'B' })]);
  const b = out.proxies.find(p => p.name === 'B');
  const c = out.proxies.find(p => p.name === 'C');
  assert(b && c, 'B/C 节点丢失');
  assert(out.proxies.some(p => p.name === b['dialer-proxy']), `B.dialer-proxy 悬空: ${b['dialer-proxy']}`);
  assert(out.proxies.some(p => p.name === c['dialer-proxy']), `C.dialer-proxy 悬空: ${c['dialer-proxy']}`);
  return `B→${b['dialer-proxy']}，C→${c['dialer-proxy']}`;
});

// ============================================================
// P0-3 带地区标识的外国节点不得被营销噪音词误杀
// ============================================================
check('P0-3', '非 10 大地区的国旗节点不被噪音词丢弃', () => {
  const { out } = run([mk('🇹🇷 土耳其 官网'), mk('🇧🇷 巴西 优惠'), mk('🇮🇳 印度 通知'), mk('🇭🇰 香港 01')]);
  const kept = out.proxies.map(p => p.name);
  const missing = ['土耳其', '巴西', '印度'].filter(c => !kept.some(n => n.includes(c)));
  assert(missing.length === 0, `被误杀: ${missing.join('、')}；实际存活 ${kept.join(' | ')}`);
  assert(groupsOf(out, '其他节点').length === 1, '「其他节点」组未生成');
  return `存活 ${kept.length - 1} 个节点，「其他节点」已建组`;
});

check('P0-3b', '无地区标识的纯噪音节点仍会被过滤', () => {
  const { out } = run([mk('官网 example.com'), mk('剩余流量：100GB'), mk('客服 t.me/xx'), mk('香港 01')]);
  const kept = out.proxies.map(p => p.name);
  assert(!kept.some(n => /官网|剩余流量|客服/.test(n)), `噪音节点未被过滤: ${kept.join(' | ')}`);
  return `噪音全部拦截，仅保留 ${kept.filter(n => n !== 'DIRECT | 仅IPv4').join(', ')}`;
});

check('P0-3c', '硬噪音（剩余流量 等）即使带地区标识也必丢', () => {
  const { out } = run([mk('剩余流量：100GB 香港'), mk('香港 01')]);
  const kept = out.proxies.map(p => p.name);
  assert(!kept.some(n => n.includes('剩余流量')), `硬噪音未拦截: ${kept.join(' | ')}`);
  return '剩余流量类节点仍被硬过滤';
});

// ============================================================
// P0-4 注入的 DIRECT | 仅IPv4 名称必须避让订阅节点
// ============================================================
check('P0-4', '订阅节点与注入代理同名时不产生 duplicate name', () => {
  const { out } = run([mk('DIRECT | 仅IPv4'), mk('香港 01')]);
  const all = out.proxies.map(p => p.name);
  const dup = all.filter((n, i) => all.indexOf(n) !== i);
  assert(dup.length === 0, `重复代理名: ${dup.join(', ')}`);
  return all.join(' | ');
});

// ============================================================
// P0-5 地区识别：别名补齐 + 误判修正 + 单一归属
// ============================================================
check('P0-5a', '常见机场地区码能被识别', () => {
  const { api } = run([mk('香港 01')]);
  const cases = {
    KR01: '韩国', SIN: '新加坡', ICN02: '韩国', GER01: '德国',
    LAX01: '美国', NRT01: '日本', HND02: '日本', SJC01: '美国',
  };
  const missed = Object.entries(cases).filter(([n, want]) => !api.classifyNode(n).includes(want));
  assert(missed.length === 0, `未识别: ${missed.map(([n, w]) => `${n}→期望${w}，实际[${api.classifyNode(n)}]`).join('; ')}`);
  return `${Object.keys(cases).join(', ')} 全部命中`;
});

check('P0-5b', 'FRA（法兰克福机场码）不再误判为法国', () => {
  const { api } = run([mk('香港 01')]);
  const got = api.classifyNode('FRA-01 法兰克福');
  assert(!got.includes('法国'), `FRA-01 仍被判为法国: [${got}]`);
  assert(got.includes('德国'), `FRA-01 法兰克福 未识别为德国: [${got}]`);
  assert(!api.classifyNode('FRA-01').includes('法国'), 'FRA-01 单独出现仍误判法国');
  assert(api.classifyNode('FR01').includes('法国'), 'FR01 应仍为法国');
  return `FRA-01 法兰克福 → [${got}]；FR01 → [${api.classifyNode('FR01')}]`;
});

check('P0-5c', '单节点只归属一个地区组，不跨区重复测速', () => {
  const { out } = run([mk('FRA-01 法兰克福'), mk('🇺🇸 香港 01'), mk('香港 02')]);
  const regionFamilies = ['香港', '日本', '台湾', '新加坡', '美国', '韩国', '英国', '德国', '法国', '澳大利亚'];
  const owned = (desc) => {
    const node = out.proxies.find(p => p.name.includes(desc));
    assert(node, `节点 ${desc} 丢失`);
    const hit = out['proxy-groups']
      .filter(g => regionFamilies.some(r => g.name === r || g.name === `${r}-自动选择`))
      .filter(g => g.proxies.includes(node.name));
    return { node: node.name, groups: hit.map(g => g.name) };
  };
  const fra = owned('法兰克福');
  const usFlagHk = owned('香港 01');
  assert(fra.groups.length <= 2, `${fra.node} 同时出现在 ${fra.groups.join(', ')}`);
  assert(!(fra.groups.some(g => g.startsWith('法国')) && fra.groups.some(g => g.startsWith('德国'))), `${fra.node} 仍在法国/德国两组并存: ${fra.groups.join(', ')}`);
  assert(usFlagHk.groups.length <= 2, `${usFlagHk.node} 同时出现在 ${usFlagHk.groups.join(', ')}`);
  assert(!(usFlagHk.groups.some(g => g.startsWith('香港')) && usFlagHk.groups.some(g => g.startsWith('美国'))), `${usFlagHk.node} 仍在香港/美国两组并存: ${usFlagHk.groups.join(', ')}`);
  return `${fra.node}→[${fra.groups.join(', ')}]；${usFlagHk.node}→[${usFlagHk.groups.join(', ')}]`;
});

// ============================================================
// P1 架构合理性（对照 mihomo 官方文档 v1.19.32 与社区通行做法）
// ============================================================
check('P1-1', '境外场景组不含「国内直连」出口', () => {
  const { out } = run([mk('🇭🇰 香港 01'), mk('🇺🇸 美国 01')]);
  const overseas = ['AI', 'Google', 'YouTube', 'OneDrive', 'GitHub'];
  const bad = overseas.filter(n => {
    const g = out['proxy-groups'].find(x => x.name === n);
    return g && g.proxies.includes('国内直连');
  });
  assert(bad.length === 0, `以下境外组仍提供直连出口: ${bad.join(', ')}`);
  // 必须仍保留兜底自动选择，保证组内始终有出口
  for (const n of overseas) {
    const g = out['proxy-groups'].find(x => x.name === n);
    if (g) assert(g.proxies.includes('兜底自动选择'), `${n} 缺少兜底自动选择`);
  }
  return `已移除: ${overseas.join(', ')}；每组仍保留兜底自动选择`;
});

check('P1-1b', 'Microsoft/Apple 仍默认国内直连（直连需求由这两个组承担）', () => {
  const { out } = run([mk('🇭🇰 香港 01')]);
  for (const n of ['Microsoft', 'Apple']) {
    const g = out['proxy-groups'].find(x => x.name === n);
    assert(g['default-selected'] === '国内直连', `${n} 默认出口应为国内直连，实际 ${g['default-selected']}`);
  }
  return 'Microsoft/Apple → 国内直连';
});

check('P1-2', 'APNs 专线组与规则已移除', () => {
  const { out } = run([mk('🇭🇰 香港 01')]);
  assert(!out['proxy-groups'].some(g => g.name === 'Apple Push'), 'Apple Push 组仍然存在');
  const apnsRules = out.rules.filter(r => String(r).includes('Apple Push'));
  assert(apnsRules.length === 0, `仍有指向 Apple Push 组的规则: ${apnsRules.join(' | ')}`);
  // APNs 专用 IP 段不应再单列
  const apnsCidr = out.rules.filter(r => /^IP-CIDR,17\.(249|252|57|188)\./.test(String(r)));
  assert(apnsCidr.length === 0, `APNs 专用 IP 规则仍存在: ${apnsCidr.join(' | ')}`);
  // push.apple.com 必须仍被某条规则接住，不能掉进 MATCH 裸奔
  const pushRule = out.rules.find(r => String(r).startsWith('DOMAIN-SUFFIX,push.apple.com,'));
  assert(pushRule, 'push.apple.com 没有对应规则，会掉进 MATCH');
  return `APNs 组/规则已移除，push.apple.com → ${String(pushRule).split(',')[2]}`;
});

check('P1-3', '手动选择组包含兜底自动选择', () => {
  const { out } = run([mk('🇭🇰 香港 01')]);
  const g = out['proxy-groups'].find(x => x.name === '手动选择');
  assert(g.proxies.includes('兜底自动选择'), `手动选择缺少兜底自动选择: ${g.proxies.join(', ')}`);
  return `手动选择: ${g.proxies.join(', ')}`;
});

check('P1-4', 'default-nameserver 不含 system（文档要求必须为 IP）', () => {
  // 分支 A：OVERRIDE_DNS = true，走 buildDnsAndHosts
  const outA = run([mk('🇭🇰 香港 01')], {}, { OVERRIDE_DNS: true }).out;
  const dnA = outA.dns?.['default-nameserver'] || [];
  assert(dnA.length > 0, 'OVERRIDE_DNS=true 时未生成 default-nameserver');
  assert(!dnA.includes('system'), `OVERRIDE_DNS 分支 default-nameserver 仍含 system: ${JSON.stringify(dnA)}`);

  // 分支 B：默认路径（OVERRIDE_PROXY_DNS），走 buildProxyServerDnsPatch
  const outB = run([mk('🇭🇰 香港 01')], { dns: { enable: true, nameserver: ['https://doh.pub/dns-query'] } }).out;
  const dnB = outB.dns?.['default-nameserver'] || [];
  assert(dnB.length > 0, '默认路径未补齐 default-nameserver');
  assert(!dnB.includes('system'), `默认路径 default-nameserver 仍含 system: ${JSON.stringify(dnB)}`);
  // proxy-server-nameserver 保留 system 作为节点解析的最终兜底
  const psn = outB.dns?.['proxy-server-nameserver'] || [];
  assert(psn.includes('system'), `proxy-server-nameserver 应保留 system 兜底: ${JSON.stringify(psn)}`);
  return `A=${JSON.stringify(dnA)} B=${JSON.stringify(dnB)}`;
});

check('P1-5', 'my_proxy / my_direct 不含 IP 类规则（classical 下会静默失效）', () => {
  const fs2 = fs;
  for (const f of ['rules/my_proxy.list', 'rules/my_direct.list']) {
    const lines = fs2.readFileSync(path.join(repo, f), 'utf8')
      .split('\n').map(l => l.trim())
      .filter(l => l && !l.startsWith('#'));
    const ipRules = lines.filter(l => /^(IP-CIDR6?|GEOIP|IP-ASN|IP-SUFFIX),/i.test(l));
    assert(ipRules.length === 0, `${f} 含 IP 类规则（classical 行为下被忽略）: ${ipRules.join(' | ')}`);
  }
  return '两个 list 均为纯域名规则';
});

// ============================================================
// AI 严谨性（诉求：稳定优先、默认美国、覆盖主流服务）
// ============================================================
check('AI-1', 'AI 组为 fallback，首选美国-自动选择，不追最低延迟', () => {
  const { out } = run([mk('🇭🇰 香港 01'), mk('🇺🇸 美国 01'), mk('🇺🇸 美国 02')]);
  const ai = out['proxy-groups'].find(g => g.name === 'AI');
  assert(ai, 'AI 组不存在');
  assert(ai.type === 'fallback', `AI 应为 fallback（只在失败时切换），实际 ${ai.type}`);
  assert(ai.proxies[0] === '美国-自动选择', `首选应为区间测速组，实际 ${ai.proxies[0]}`);
  assert(ai['empty-fallback'] === 'REJECT', 'AI 组缺 empty-fallback: REJECT');
  assert(ai['exclude-type'] === 'DIRECT', 'AI 组需排除 DIRECT 类型');
  return `fallback: ${ai.proxies.join(' → ')}`;
});

check('AI-2', 'AI 规则覆盖官方聚合分类，而非仅三家', () => {
  const { out } = run([mk('🇺🇸 美国 01')]);
  const aiRules = out.rules.filter(r => String(r).endsWith(',AI'));
  assert(aiRules.length > 0, '没有指向 AI 组的规则');
  const providers = out['rule-providers'];
  const used = aiRules.map(r => String(r).split(',')[1]);
  const missing = used.filter(n => !providers[n]);
  assert(missing.length === 0, `AI 规则引用了未定义规则集: ${missing.join(', ')}`);
  // 必须用官方 AI 分类，覆盖 Copilot / Cursor / Perplexity 等
  assert(used.some(n => n === 'ai_domain'), `AI 应引用 ai_domain，实际 ${used.join(', ')}`);
  const url = providers.ai_domain.url;
  assert(url.includes('category-ai-chat'), `ai_domain 应指向官方 AI 分类，实际 ${url}`);
  return `${used.join(', ')} → ${url.split('/').pop()}`;
});

check('AI-3', '无美国节点时 AI 降级到默认代理且不崩溃', () => {
  const { out } = run([mk('🇭🇰 香港 01')]);
  const ai = out['proxy-groups'].find(g => g.name === 'AI');
  assert(ai, 'AI 组不存在');
  assert(!ai.proxies.includes('美国-自动选择'), '没有美国节点却引用了美国-自动选择');
  assert(ai.proxies.includes('兜底自动选择'), 'AI 降级后应保留兜底出口');
  return `降级后成员: ${ai.proxies.join(', ')}`;
});

// ============================================================
// 非 AI 高频服务（诉求：国内有入口走直连，否则走默认代理）
// ============================================================
check('SVC-1', 'Cloudflare 关键子域显式走代理，且早于国内直连兜底', () => {
  const { out } = run([mk('🇭🇰 香港 01')]);
  const cf = ['challenges.cloudflare.com', 'workers.dev', 'pages.dev', 'cdnjs.cloudflare.com'];
  for (const d of cf) {
    const idx = out.rules.findIndex(r => String(r).startsWith(`DOMAIN-SUFFIX,${d},`));
    assert(idx >= 0, `缺少 Cloudflare 规则: ${d}`);
    const target = String(out.rules[idx]).split(',')[2];
    assert(target === '默认代理', `${d} 应走默认代理，实际 ${target}`);
    // 必须早于 cn_domain / cn_ip 兜底，否则会被判为国内直连
    const cnIdx = out.rules.findIndex(r => String(r).startsWith('RULE-SET,cn_domain,'));
    assert(idx < cnIdx, `${d} 规则(${idx}) 必须在 cn_domain(${cnIdx}) 之前`);
  }
  return `${cf.length} 条关键子域 → 默认代理`;
});

check('SVC-2', 'Microsoft / Apple 保留国内直连快路径', () => {
  const { out } = run([mk('🇭🇰 香港 01')]);
  for (const n of ['microsoft_cn', 'apple_cn']) {
    const r = out.rules.find(x => String(x).startsWith(`RULE-SET,${n},`));
    assert(r, `缺少 ${n} 国内快路径规则`);
    assert(String(r).split(',')[2] === '国内直连', `${n} 应走国内直连`);
  }
  return 'microsoft_cn / apple_cn → 国内直连';
});

check('SVC-3', 'GitHub / YouTube 走代理组，不被国内兜底截走', () => {
  const { out } = run([mk('🇭🇰 香港 01')]);
  const cnIdx = out.rules.findIndex(r => String(r).startsWith('RULE-SET,cn_domain,'));
  for (const [p, target] of [['github_domain', 'GitHub'], ['youtube_domain', 'YouTube']]) {
    const idx = out.rules.findIndex(r => String(r).startsWith(`RULE-SET,${p},`));
    assert(idx >= 0, `缺少 ${p} 规则`);
    assert(idx < cnIdx, `${p} 必须早于 cn_domain`);
    assert(String(out.rules[idx]).split(',')[2] === target, `${p} 应指向 ${target}`);
  }
  return 'github/youtube 规则位于 cn_domain 之前';
});

// ============================================================
// 内核级校验（MIHOMO=1 时执行）
// ============================================================
if (process.env.MIHOMO) {
  const kernelCases = {
    'P0-1': () => run([mk('🇭🇰 香港 01'), mk('🇯🇵 日本 01'), mk('🇺🇸 美国 01')], { 'mixed-port': 7890 }, {}, { 分流组添加所有节点: true }).out,
    'P0-2': () => run([mk('香港'), mk('中转', { 'dialer-proxy': '香港' })]).out,
    'P0-4': () => run([mk('DIRECT | 仅IPv4'), mk('香港 01')]).out,
    'P0-5': () => run([mk('FRA-01 法兰克福'), mk('🇺🇸 香港 01'), mk('KR01'), mk('LAX01')]).out,
  };
  for (const [id, build] of Object.entries(kernelCases)) {
    check(`${id}-kernel`, `${id} 生成配置通过 mihomo -t`, () => {
      const r = mihomoTest(id, build());
      assert(r.ok, r.msg);
      return 'test is successful';
    });
  }
}

// ---- 输出 ----
let failed = 0;
for (const r of results) {
  if (!r.pass) failed++;
  console.log(`${r.pass ? '✓' : '✗'} ${r.id.padEnd(10)} ${r.title}`);
  console.log(`       └─ ${r.detail}`);
}
console.log(`\n${results.length - failed}/${results.length} 通过${failed ? `，${failed} 失败` : ''}`);
fs.rmSync(tmpDir, { recursive: true, force: true });
process.exit(failed ? 1 : 0);
