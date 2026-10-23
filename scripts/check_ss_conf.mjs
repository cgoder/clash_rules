#!/usr/bin/env node
// ss.conf（Shadowrocket）静态校验
//
// Shadowrocket 没有官方的 .conf 语法规范，也没有 CLI 可以 -t 验证。所以本
// 脚本只能在编译期抓住两类最容易出错的静默失败：
//
//   A. 规则指向的策略组 / 关键字不存在  → 该条规则不生效
//   B. RULE-SET 指向的远程文件不含规则类型 → 整份规则集被丢弃
//
// B 是最隐蔽的：blackmatrix7 有 Xxx.list（含规则类型，配 RULE-SET）与
// Xxx_Domain.list（纯域名表，配 DOMAIN-SET）两种，混用不会报错，只会静默
// 失效。脚本按 URL 命名约定 + 实际抓取内容双重判断。
//
// 用法：
//   node scripts/check_ss_conf.mjs          # 只做离线检查
//   node scripts/check_ss_conf.mjs --remote # 额外抓取远程规则集首行验证
// 退出码：0 通过，1 失败。

import fs from 'node:fs';
import path from 'node:path';

const repo = path.resolve(import.meta.dirname, '..');
const RAW = fs.readFileSync(path.join(repo, 'ss.conf'), 'utf8');
const CHECK_REMOTE = process.argv.includes('--remote');

const results = [];
const ok = (id, title) => results.push({ id, title, ok: true });
const bad = (id, title, detail) => results.push({ id, title, ok: false, detail });

// ---------------------------------------------------------------- 解析
/** 拆成 { section: [{line, no}] }，忽略 # 注释与空行 */
function parse(text) {
  const sections = {};
  let cur = null;
  text.split('\n').forEach((raw, i) => {
    const no = i + 1;
    const line = raw.trim();
    if (!line || line.startsWith('#') || line.startsWith(';')) return;
    if (line.startsWith('[') && line.endsWith(']')) {
      cur = line.slice(1, -1).trim();
      sections[cur] ??= [];
      return;
    }
    if (cur) sections[cur].push({ line, no });
  });
  return sections;
}
const S = parse(RAW);

for (const need of ['General', 'Proxy Group', 'Rule']) {
  if (!S[need]) bad('section', `缺少必需段落 [${need}]`);
}

// ---------------------------------------------------------------- 策略组
const KEYWORD = new Set(['PROXY', 'DIRECT', 'REJECT']);
const KEYWORD_PREFIX = /^(REJECT|DIRECT|PROXY)-/;

const groups = new Map(); // name -> {type, members[]}
for (const { line, no } of S['Proxy Group'] ?? []) {
  const eq = line.indexOf('=');
  if (eq < 0) {
    bad('group-syntax', `[Proxy Group] 第 ${no} 行缺少 "="`, line);
    continue;
  }
  const name = line.slice(0, eq).trim();
  const parts = line.slice(eq + 1).split(',').map(s => s.trim()).filter(Boolean);
  const type = parts.shift();
  const members = [];
  for (const p of parts) {
    if (p.includes('=')) continue;        // 参数，如 url=、interval=
    members.push(p);
  }
  groups.set(name, { type, members });
}

// Shadowrocket 支持的组类型（取自 lazy_group.conf 注释）
const GROUP_TYPES = new Set(['select', 'url-test', 'fallback', 'load-balance', 'random']);
for (const [name, g] of groups) {
  if (!GROUP_TYPES.has(g.type)) {
    bad('group-type', `策略组「${name}」的类型 ${g.type} 不在已知集合内`, [...GROUP_TYPES].join(', '));
  }
}
if (groups.size && !results.some(r => r.id === 'group-type')) {
  ok('group-type', `${groups.size} 个策略组类型均合法`);
}

// 组间引用必须存在（A 类错误）
const groupRefErrors = [];
for (const [name, g] of groups) {
  if (g.type !== 'select' && g.type !== 'fallback') continue; // url-test 等用正则，不列成员
  for (const m of g.members) {
    if (KEYWORD.has(m) || KEYWORD_PREFIX.test(m)) continue;
    if (!groups.has(m)) groupRefErrors.push(`「${name}」引用不存在的组「${m}」`);
  }
}
if (groupRefErrors.length) bad('group-ref', '策略组成员引用不完整', groupRefErrors.join(' | '));
else ok('group-ref', '策略组成员引用的组均存在');

// ---------------------------------------------------------------- 规则
const RULE_TYPES = new Set([
  'DOMAIN', 'DOMAIN-SUFFIX', 'DOMAIN-KEYWORD', 'DOMAIN-WILDCARD', 'DOMAIN-SET',
  'IP-CIDR', 'IP-CIDR6', 'IP-ASN', 'GEOIP', 'USER-AGENT', 'URL-REGEX',
  'RULE-SET', 'SCRIPT', 'DST-PORT', 'PROTOCOL', 'AND', 'OR', 'NOT', 'FINAL',
]);

const rules = S['Rule'] ?? [];
const unknownTypes = [];
const missingTargets = [];
const remoteSets = []; // {kind, url, target, no}

/** 取一行规则的「目标策略」——AND/OR/NOT 等逻辑规则的目标在最后一个逗号后 */
function targetOf(line) {
  return line.slice(line.lastIndexOf(',') + 1).trim();
}

for (const { line, no } of rules) {
  const type = line.split(',')[0].trim();
  if (!RULE_TYPES.has(type)) {
    unknownTypes.push(`第 ${no} 行: ${type}`);
    continue;
  }
  const target = targetOf(line);
  if (type === 'FINAL' || type === 'MATCH') {
    if (!groups.has(target) && !KEYWORD.has(target) && !KEYWORD_PREFIX.test(target)) {
      missingTargets.push(`第 ${no} 行 ${type}: 目标「${target}」不存在`);
    }
    continue;
  }
  if (type === 'RULE-SET' || type === 'DOMAIN-SET') {
    const url = line.split(',')[1]?.trim();
    remoteSets.push({ kind: type, url, target, no });
  }
  if (!groups.has(target) && !KEYWORD.has(target) && !KEYWORD_PREFIX.test(target)) {
    missingTargets.push(`第 ${no} 行 ${type}: 目标「${target}」不存在`);
  }
}
if (unknownTypes.length) bad('rule-type', '未知规则类型', unknownTypes.join(' | '));
else ok('rule-type', `${rules.length} 条规则的类型均合法`);

if (missingTargets.length) bad('rule-target', '规则目标不存在（该规则会不生效）', missingTargets.join(' | '));
else ok('rule-target', '所有规则的策略目标均存在');

// 必须有 FINAL / MATCH 兜底
const last = rules.at(-1);
if (!last || !/^(FINAL|MATCH),/.test(last.line)) {
  bad('final', '最后一条规则必须是 FINAL 或 MATCH', last ? `实际为第 ${last.no} 行: ${last.line}` : '无规则');
} else {
  ok('final', `兜底规则在第 ${last.no} 行: ${last.line}`);
}

// ---------------------------------------------------------------- 远程规则集
// blackmatrix7 的命名约定是 *_Domain.list 为纯域名表（配 DOMAIN-SET），其余
// *.list 含规则类型（配 RULE-SET）。但约定并不普适：MetaCubeX 的
// geo/geosite/apple-cn.list 同样是纯域名表，文件名却没有 _Domain 后缀。
//
// 因此离线检查只报「命名约定的明确反例」（RULE-SET 指向 _Domain.list），
// DOMAIN-SET 的正确性交给 --remote 的内容检查，避免把正确配置误报为错误。
const misused = [];
for (const { kind, url, no } of remoteSets) {
  if (!url?.startsWith('http')) {
    misused.push(`第 ${no} 行: ${kind} 的 URL 不是 http(s)`);
    continue;
  }
  const isDomainTableByName = /_Domain\.list$/i.test(url);
  if (kind === 'RULE-SET' && isDomainTableByName) {
    misused.push(`第 ${no} 行: ${kind} 加载了纯域名表（应用 DOMAIN-SET）: ${url}`);
  }
}
if (misused.length) {
  bad('ruleset-kind', 'RULE-SET 指向了纯域名表', misused.join(' | '));
} else {
  ok('ruleset-kind', `${remoteSets.length} 个远程规则集未发现明显类型错配`);
}

// ---------------------------------------------------------------- General
const gen = new Map();
for (const { line } of S['General'] ?? []) {
  const eq = line.indexOf('=');
  if (eq > 0) gen.set(line.slice(0, eq).trim(), line.slice(eq + 1).trim());
}

// skip-proxy / tun-excluded-routes 里若有 10.7.0.1，会与 SideStore 续签冲突
const bypass = (gen.get('skip-proxy') ?? '') + ',' + (gen.get('tun-excluded-routes') ?? '');
const hasLoopbackExact = /(^|,)\s*10\.7\.0\.1(\/\d+)?\s*(,|$)/.test(bypass);
if (hasLoopbackExact) {
  bad('loopback', '10.7.0.1 被 skip-proxy / tun-excluded-routes 精确排除');
} else {
  ok('loopback', 'loopback 未被精确排除（Shadowrocket 本身不支持 loopback 反射，见文件头注释）');
}

const blockQuic = gen.get('block-quic');
if (blockQuic && !['all-proxy', 'all', 'always-allow'].includes(blockQuic)) {
  bad('block-quic', `block-quic 取值非法: ${blockQuic}`, '可选 all-proxy / all / always-allow');
} else {
  ok('block-quic', `block-quic = ${blockQuic ?? '(未设置)'}`);
}

// 规则顺序陷阱：GitHub 必须先于 Microsoft，YouTube 必须先于 Google
const idxOf = needle => rules.findIndex(r => r.line.includes(needle));
const gh = idxOf('/GitHub/GitHub.list'), yt = idxOf('/YouTube/YouTube.list');
const gg = idxOf('/Google/Google.list'), cm = idxOf('/ChinaMax/');
const orderBad = [];
if (gh >= 0 && idxOf('/Microsoft/Microsoft.list') >= 0 && gh > idxOf('/Microsoft/Microsoft.list')) {
  orderBad.push('GitHub 必须早于 Microsoft');
}
if (yt >= 0 && gg >= 0 && yt > gg) orderBad.push('YouTube 必须早于 Google');
if (cm >= 0) {
  for (const host of ['gsa.apple.com', 'developerservices2.apple.com', 'gspe1-ssl.ls.apple.com']) {
    const at = idxOf(host);
    if (at < 0) orderBad.push(`缺少 Apple 认证域名规则 ${host}`);
    else if (at > cm) orderBad.push(`${host} 必须早于 ChinaMax`);
  }
}
if (orderBad.length) bad('order', '规则顺序陷阱', orderBad.join(' | '));
else ok('order', '规则顺序检查通过（Apple 认证 / GitHub / YouTube 均在前）');

// ---------------------------------------------------------------- 可选联网
if (CHECK_REMOTE) {
  const seen = new Set();
  const problems = [];
  for (const { kind, url, no } of remoteSets) {
    if (seen.has(url)) continue;
    seen.add(url);
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
      if (!res.ok) {
        problems.push(`第 ${no} 行 HTTP ${res.status}: ${url}`);
        continue;
      }
      const text = (await res.text()).slice(0, 4000);
      const first = text.split('\n').map(l => l.trim()).find(l => l && !l.startsWith('#'));
      const hasType = first && /^[A-Z][A-Z-]+,/.test(first) || /^(DOMAIN|IP-CIDR|USER-AGENT|URL-REGEX)/.test(first ?? '');
      if (kind === 'RULE-SET' && !hasType) {
        problems.push(`第 ${no} 行 RULE-SET 首行无规则类型（"${first}"）: ${url}`);
      }
      if (kind === 'DOMAIN-SET' && hasType) {
        problems.push(`第 ${no} 行 DOMAIN-SET 首行含规则类型（"${first}"）: ${url}`);
      }
    } catch (e) {
      problems.push(`第 ${no} 行抓取失败 ${e.name}: ${url}`);
    }
  }
  if (problems.length) bad('remote', '远程规则集内容与声明不符', problems.join(' | '));
  else ok('remote', `${seen.size} 个远程规则集内容与声明一致`);
}

// ---------------------------------------------------------------- 输出
const failed = results.filter(r => !r.ok);
for (const r of results) {
  console.log(`${r.ok ? '✓' : '✗'} ${r.id.padEnd(12)} ${r.title}${r.detail ? `\n   └─ ${r.detail}` : ''}`);
}
console.log(`\n${results.length - failed.length}/${results.length} 通过`);
process.exit(failed.length ? 1 : 0);
