// flclash.js 专项校验
//
// flclash.js 是独立的第三方生成脚本（组名 节点选择 / AI专线 / 亚太智能优选），
// 不受 clash.js ⇄ clashmi.yml 一致性校验管辖，但它同样必须守住几条会静默
// 失效的硬约束：SideStore 续签的 loopback、认证域名必须显式走代理、空组不得
// 回退到 COMPATIBLE。
//
// 用法：node scripts/check_flclash.mjs
//       MIHOMO=1 node scripts/check_flclash.mjs   # 额外跑 mihomo -t
// 退出码：0 通过，1 失败。

import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';

const repo = path.resolve(import.meta.dirname, '..');
const SRC = fs.readFileSync(path.join(repo, 'flclash.js'), 'utf8');

const sb = { console: { log() {} } };
vm.createContext(sb);
new vm.Script(SRC + '\n;__main = main;').runInContext(sb);

const mk = n => ({ name: n, type: 'ss', server: 'a.example.com', port: 443, cipher: 'aes-128-gcm', password: 'x' });
const PROBE = ['香港 01', '台湾 01', '新加坡 01', '日本 01', '韩国 01', '美国 01'];
const cfg = JSON.parse(JSON.stringify(sb.__main({ proxies: PROBE.map(mk) })));

const results = [];
const ok = (id, title) => results.push({ id, title, ok: true });
const bad = (id, title, detail) => results.push({ id, title, ok: false, detail });

// ------------------------------------------------------------
// 1. SideStore / LiveContainer 续签：loopback 必须存在且不被排斥网段覆盖
// ------------------------------------------------------------
const LOOPBACK = '10.7.0.1';
const tun = cfg.tun || {};
const loopbacks = Array.isArray(tun['loopback-address']) ? tun['loopback-address'] : [];
if (!loopbacks.includes(LOOPBACK)) {
  bad('loopback', `tun.loopback-address 必须包含 ${LOOPBACK}`, JSON.stringify(loopbacks));
} else {
  ok('loopback', `tun.loopback-address 包含 ${LOOPBACK}`);
}

const toNet = s => {
  const [net, bits] = String(s).split('/');
  if (!bits) return null;
  const oct = net.split('.').map(Number);
  if (oct.length !== 4 || oct.some(n => Number.isNaN(n))) return null;
  const ip = ((oct[0] << 24) >>> 0) + (oct[1] << 16) + (oct[2] << 8) + oct[3];
  return { base: ip, mask: bits === '0' ? 0 : (0xffffffff << (32 - Number(bits))) >>> 0 };
};

const excludes = Array.isArray(tun['route-exclude-address']) ? tun['route-exclude-address'] : [];
const [lbIp] = LOOPBACK.split('/');
const lo = lbIp.split('.').map(Number);
const loInt = ((lo[0] << 24) >>> 0) + (lo[1] << 16) + (lo[2] << 8) + lo[3];
const covering = excludes.filter(ex => {
  if (!String(ex).includes('.')) return false; // IPv6 段不覆盖 10.7.0.1
  const n = toNet(ex);
  return n && ((loInt & n.mask) >>> 0) === n.base;
});
if (covering.length) {
  bad('loopback-exclude', `${LOOPBACK} 被 route-exclude-address 覆盖，续签会失效`, covering.join(', '));
} else {
  ok('loopback-exclude', `${LOOPBACK} 未被 route-exclude-address 覆盖`);
}

// ------------------------------------------------------------
// 2. TUN 键名：mihomo 对未知键静默忽略
// ------------------------------------------------------------
const KNOWN_TUN_KEYS = new Set([
  'enable', 'stack', 'device', 'mtu', 'gso', 'gso-max-size',
  'auto-route', 'auto-redirect', 'auto-detect-interface', 'strict-route',
  'route-address', 'route-address-set', 'route-exclude-address', 'route-exclude-address-set',
  'endpoint-independent-nat', 'loopback-address', 'dns-hijack',
  'inet4-address', 'inet6-address', 'udp-timeout', 'interface-name',
  'routing-mark', 'include-interface', 'exclude-interface',
  'include-uid', 'exclude-uid', 'include-android-user', 'exclude-package',
  'include-package', 'file-descriptor', 'file-descriptor-protected',
]);
const unknown = Object.keys(tun).filter(k => !KNOWN_TUN_KEYS.has(k));
if (unknown.length) {
  bad('tun-keys', 'flclash.js: 未知的 tun 键（内核会静默忽略）', unknown.join(', '));
} else {
  ok('tun-keys', 'flclash.js: tun 键名合法');
}

// ------------------------------------------------------------
// 3. Apple 续签认证域名必须显式走代理，且排在 apple-cn 之前
// ------------------------------------------------------------
const AUTH = ['gsa.apple.com', 'developerservices2.apple.com', 'gspe1-ssl.ls.apple.com'];
const rules = cfg.rules || [];
const appleCnAt = rules.findIndex(r => String(r).startsWith('RULE-SET,apple-cn,'));
for (const host of AUTH) {
  const at = rules.findIndex(r => String(r).startsWith(`DOMAIN,${host},`));
  const rule = at >= 0 ? String(rules[at]) : null;
  if (at < 0) {
    bad('apple-auth', `缺少显式规则 DOMAIN,${host},...`, '仅靠 geolocation-not-cn 间接命中不可靠');
    continue;
  }
  const target = rule.split(',')[2];
  if (target === 'DIRECT' || target === 'REJECT') {
    bad('apple-auth', `${host} 必须走代理，当前目标是 ${target}`, rule);
    continue;
  }
  if (appleCnAt >= 0 && at > appleCnAt) {
    bad('apple-auth', `${host} 的规则必须排在 apple-cn 之前`, `${at} > ${appleCnAt}`);
    continue;
  }
  ok('apple-auth', `${host} 显式走 ${target}，位置 ${at} < apple-cn ${appleCnAt}`);
}

// ------------------------------------------------------------
// 4. 空组不得回退到 COMPATIBLE（等同静默直连）
// ------------------------------------------------------------
const groups = cfg['proxy-groups'] || [];
const emptyFallbackBad = groups.filter(g => {
  const dynamic = g['include-all'] || g['include-all-proxies'] || g.filter || g['exclude-filter'];
  return dynamic && g['empty-fallback'] !== 'REJECT';
});
if (emptyFallbackBad.length) {
  bad('empty-fallback', '动态成员的组必须设 empty-fallback: REJECT', emptyFallbackBad.map(g => g.name).join(', '));
} else {
  ok('empty-fallback', '所有动态成员组均设 empty-fallback: REJECT');
}
const anyCompatible = groups.filter(g => g['empty-fallback'] === 'COMPATIBLE' || (Array.isArray(g.proxies) && g.proxies.includes('COMPATIBLE')));
if (anyCompatible.length) {
  bad('no-compatible', '组内不得出现 COMPATIBLE（空组直连）', anyCompatible.map(g => g.name).join(', '));
} else {
  ok('no-compatible', '组内无 COMPATIBLE');
}

// ------------------------------------------------------------
// 5. 规则引用完整性
// ------------------------------------------------------------
const groupNames = new Set(groups.map(g => g.name));
const builtin = new Set(['DIRECT', 'REJECT', 'REJECT-DROP', 'PASS', 'COMPATIBLE', 'GLOBAL']);
const providers = new Set(Object.keys(cfg['rule-providers'] || {}));
const brokenTargets = [];
for (const r of rules) {
  const s = String(r);
  if (s.startsWith('RULE-SET,')) {
    const [, provider, target] = s.split(',');
    if (!providers.has(provider)) brokenTargets.push(`未定义规则集 ${provider}: ${s}`);
    if (target && !groupNames.has(target) && !builtin.has(target)) brokenTargets.push(`目标组不存在: ${s}`);
  } else if (s.startsWith('DOMAIN') || s.startsWith('PROCESS-NAME') || s.startsWith('MATCH')) {
    const target = s.split(',').pop();
    if (!groupNames.has(target) && !builtin.has(target)) brokenTargets.push(`目标组不存在: ${s}`);
  }
}
if (brokenTargets.length) {
  bad('rule-target', '规则引用不完整', brokenTargets.join(' | '));
} else {
  ok('rule-target', '规则引用的规则集与目标组均存在');
}

// ------------------------------------------------------------
// 6. 可选：mihomo -t
// ------------------------------------------------------------
if (process.env.MIHOMO === '1') {
  const cache = path.join(repo, 'temp/traces/gemini-audit/ruleset');
  const dir = fs.mkdtempSync('/tmp/flclash-check-');
  fs.mkdirSync(path.join(dir, 'ruleset'), { recursive: true });
  const c = JSON.parse(JSON.stringify(cfg));
  for (const p of Object.values(c['rule-providers'] || {})) {
    const name = p.path.replace('./ruleset/', '');
    // 用 JS 规则集内容替换远程 URL，避免联网
    if (fs.existsSync(path.join(cache, name))) {
      fs.copyFileSync(path.join(cache, name), path.join(dir, 'ruleset', name));
      p.type = 'file';
      p.url = undefined;
      delete p.url;
      p.path = './ruleset/' + name;
    }
  }
  const cfgPath = path.join(dir, 'config.yaml');
  fs.writeFileSync(cfgPath, JSON.stringify(c));
  const r = spawnSync('mihomo', ['-d', dir, '-t', '-f', cfgPath], { encoding: 'utf8' });
  const out = (r.stdout || '') + (r.stderr || '');
  if (r.status === 0) {
    ok('mihomo', 'mihomo -t 通过');
  } else {
    bad('mihomo', 'mihomo -t 失败', out.split('\n').filter(Boolean).slice(-4).join(' | '));
  }
  fs.rmSync(dir, { recursive: true, force: true });
}

// ------------------------------------------------------------
const failed = results.filter(r => !r.ok);
for (const r of results) {
  console.log(`${r.ok ? '✓' : '✗'} ${r.id.padEnd(16)} ${r.title}${r.detail ? `\n   └─ ${r.detail}` : ''}`);
}
console.log(`\n${results.length - failed.length}/${results.length} 通过`);
process.exit(failed.length ? 1 : 0);
