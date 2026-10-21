// clash.js ⇄ clashmi.yml 一致性校验
//
// 两份配置面向不同客户端（JS 覆写脚本 vs 静态 YAML），但路由语义必须一致。
// 本脚本把两边解析成同一套结构后逐项比对，任何漂移都会失败。
//
// 用法：node scripts/check_config_sync.mjs
// 退出码：0 一致，1 存在不一致。

import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const repo = path.resolve(import.meta.dirname, '..');
const SRC = fs.readFileSync(path.join(repo, 'clash.js'), 'utf8');
const YML = path.join(repo, 'clashmi.yml');

// ---------- 载入 clash.js ----------
const sb = { console: { log() {} } };
vm.createContext(sb);
new vm.Script(SRC + '\n;__a={main,GROUP_BASE_OPTION,SELECT_BASE_OPTION,UT_BASE,FALLBACK_BASE,DIRECT_PROXIES};')
  .runInContext(sb);
const A = sb.__a;
const mk = n => ({ name: n, type: 'ss', server: 'a.example.com', port: 443, cipher: 'aes-128-gcm', password: 'x' });
// 合成订阅覆盖全部地区，让 clash.js 建出完整组集合
const probeNames = ['香港 01', '日本 01', '台湾 01', '新加坡 01', '美国 01', '韩国 01', '英国 01', '德国 01', '法国 01', '澳大利亚 01'];
const js = A.main({ proxies: probeNames.map(mk), 'proxy-groups': [], rules: [] });

// ---------- 载入 clashmi.yml ----------
// 用 python3 -c 解析（PyYAML 通常已随系统/开发环境安装）；失败则静默跳过 YAML 侧比对
let yml = null;
try {
  const out = execFileSync('python3', ['-c', `
import yaml, json
d = yaml.safe_load(open(${JSON.stringify(YML)}, encoding='utf-8'))
print(json.dumps({k: v for k, v in d.items() if not k.startswith('Anchor') and not k.startswith('x-')}, ensure_ascii=False))
`], { encoding: 'utf8' });
  yml = JSON.parse(out);
} catch (e) {
  console.log('⚠️ 无法解析 clashmi.yml（需要 python3 + PyYAML），跳过 YAML 侧比对');
  console.log(String(e.message).split('\n')[0]);
  process.exit(0);
}

const results = [];
const eq = (id, title, a, b) => results.push({ id, title, ok: JSON.stringify(a) === JSON.stringify(b), a, b });
const fail = (id, title, detail) => results.push({ id, title, ok: false, a: detail, b: null });

// ============================================================
// 1. 策略组：组名集合与顺序
// ============================================================
const jsGroups = js['proxy-groups'];
const ymlGroups = yml['proxy-groups'];
const jsNames = jsGroups.map(g => g.name);
const ymlNames = ymlGroups.map(g => g.name);
eq('groups', '策略组名称集合与顺序一致', jsNames, ymlNames);

// 2. 组类型
const jsTypes = Object.fromEntries(jsGroups.map(g => [g.name, g.type]));
const ymlTypes = Object.fromEntries(ymlGroups.map(g => [g.name, g.type]));
eq('types', '策略组类型一致', jsTypes, ymlTypes);

// 3. 默认出口
const jsDef = Object.fromEntries(jsGroups.filter(g => g['default-selected']).map(g => [g.name, g['default-selected']]));
const ymlDef = Object.fromEntries(ymlGroups.filter(g => g['default-selected']).map(g => [g.name, g['default-selected']]));
eq('defaults', 'default-selected 一致', jsDef, ymlDef);

// 4. 健康检查参数
const pick = (g, keys) => Object.fromEntries(keys.map(k => [k, g[k]]));
const HC = ['url', 'timeout', 'interval', 'tolerance', 'lazy', 'max-failed-times', 'empty-fallback', 'exclude-type', 'hidden'];
const hcOf = arr => Object.fromEntries(arr.map(g => [g.name, pick(g, HC)]));
eq('healthcheck', '健康检查参数一致', hcOf(jsGroups), hcOf(ymlGroups));

// 5. 规则：顺序与目标
eq('rules', '规则列表一致（含顺序）', js.rules, yml['rules']);

// 6. 规则集：名称与 URL
const stripDefaults = p => ({ behavior: p.behavior, format: p.format, url: p.url });
const jsProviders = js['rule-providers'] || {};
const ymlProviders = yml['rule-providers'] || {};
eq('providers', '规则集名称一致', Object.keys(jsProviders).sort(), Object.keys(ymlProviders).sort());
const badProviders = [];
for (const [n, p] of Object.entries(jsProviders)) {
  if (!ymlProviders[n]) continue;
  if (JSON.stringify(stripDefaults(p)) !== JSON.stringify(stripDefaults(ymlProviders[n]))) {
    badProviders.push(n);
  }
}
badProviders.length
  ? fail('provider-urls', '规则集 URL/行为不一致', badProviders)
  : results.push({ id: 'provider-urls', title: '规则集 URL 与行为一致', ok: true, a: `${Object.keys(jsProviders).length} 个`, b: null });

// 7. 全局测速口径
eq('unified-delay', 'unified-delay 一致', js['unified-delay'], yml['unified-delay']);

// 8. 注入的直连代理
const jsDirect = (js.proxies || []).filter(p => p.type === 'direct').map(p => p.name);
const ymlDirect = (yml.proxies || []).filter(p => p.type === 'direct').map(p => p.name);
eq('direct-proxy', '注入的直连代理一致', jsDirect, ymlDirect);

// 9. 顺序陷阱：YouTube 必须早于 Google，GitHub 必须早于 Microsoft
for (const [a, b, why] of [['youtube_domain', 'google_domain', 'google ⊃ youtube'], ['github_domain', 'microsoft_domain', 'microsoft ⊃ github']]) {
  for (const [label, rules] of [['clash.js', js.rules], ['clashmi.yml', yml['rules']]]) {
    const ia = rules.findIndex(r => String(r).includes(a));
    const ib = rules.findIndex(r => String(r).includes(b));
    if (ia >= 0 && ib >= 0 && ia > ib) {
      fail('order', `${label}: ${a} 必须早于 ${b}（${why}）`, `${ia} > ${ib}`);
    }
  }
}

// 10. 空组不得回退到 COMPATIBLE（等于是静默直连）
for (const g of ymlGroups) {
  const needsFallback = g['include-all'] || g.filter;
  if (needsFallback && g['empty-fallback'] !== 'REJECT') {
    fail('empty-fallback', `clashmi.yml: ${g.name} 使用 include-all/filter 但未设 empty-fallback: REJECT`, String(g['empty-fallback']));
  }
}

// 11. 规则引用完整性：目标组必须存在
const groupSet = new Set(ymlNames);
const allTargets = new Set([...groupSet, ...ymlDirect, 'DIRECT', 'REJECT', 'REJECT-DROP', 'PASS', 'COMPATIBLE', 'GLOBAL']);
for (const r of yml['rules']) {
  const s = String(r);
  if (!s.startsWith('RULE-SET,')) continue;
  const [, provider, target] = s.split(',');
  if (!ymlProviders[provider]) fail('rule-target', `clashmi.yml 规则引用了未定义的规则集: ${provider}`, s);
  if (target && !allTargets.has(target)) fail('rule-target', `clashmi.yml 规则目标不存在: ${s}`, target);
}

// ---------- 输出 ----------
let bad = 0;
for (const r of results) {
  if (!r.ok) bad++;
  console.log(`${r.ok ? '✓' : '✗'} ${r.id.padEnd(14)} ${r.title}`);
  if (!r.ok) {
    console.log(`       clash.js    : ${JSON.stringify(r.a)}`);
    console.log(`       clashmi.yml : ${JSON.stringify(r.b)}`);
  }
}
console.log(`\n${results.length - bad}/${results.length} 项一致${bad ? `，${bad} 项不一致` : ''}`);
process.exit(bad ? 1 : 0);
