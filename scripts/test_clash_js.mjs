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
  // 语义也要对：Microsoft / Apple 仍应默认直连，AI 仍应默认美国
  const pick = n => out['proxy-groups'].find(g => g.name === n)?.['default-selected'];
  assert(pick('Microsoft') === '国内直连', `Microsoft 默认应为「国内直连」，实际 ${pick('Microsoft')}`);
  assert(pick('Apple') === '国内直连', `Apple 默认应为「国内直连」，实际 ${pick('Apple')}`);
  assert(pick('AI') === '美国', `AI 默认应为「美国」，实际 ${pick('AI')}`);
  return 'Microsoft/Apple→国内直连，AI→美国，全部落位';
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
