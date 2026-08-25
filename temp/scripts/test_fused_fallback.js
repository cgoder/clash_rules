// 临时验证：融合版 fallback 兜底组
const fs = require("fs");
const path = require("path");
const src = fs.readFileSync(path.join(__dirname, "../../mihomoScript_clashmi_fused.js"), "utf8");
const origLog = console.log;
console.log = () => {};
eval(src + "; globalThis.__main=main;");
console.log = origLog;
const mainFn = globalThis.__main;

const mockProxies = [
  { name: "🇭🇰 香港 01", type: "ss", server: "1.0.0.1" },
  { name: "香港 02", type: "ss", server: "1.0.0.2" },
  { name: "日本 东京-01", type: "ss", server: "1.0.0.3" },
  { name: "新加坡 SG-01", type: "ss", server: "1.0.0.4" },
  { name: "美国 纽约", type: "ss", server: "1.0.0.5" },
  { name: "德国 DE-01", type: "ss", server: "1.0.0.6" },
  { name: "群|返利|官网", type: "ss", server: "1.0.0.7" },
  { name: "韩国 首尔", type: "ss", server: "1.0.0.8" },
  { name: "非洲节点", type: "ss", server: "1.0.0.9" },
];
const out = mainFn({ proxies: mockProxies, dns: {} });
const groups = out["proxy-groups"];
const byName = Object.fromEntries(groups.map(g => [g.name, g]));

// 1) 兜底组存在且为 fallback
const fb = byName["兜底-自动选择"];
console.log(fb ? `✅ 兜底组存在: type=${fb.type} hidden=${fb.hidden} proxies=${fb.proxies.length} 个节点` : "❌ 兜底组缺失");

// 2) 各地区自动选择组末尾含兜底组，且兜底组自身不含任何组名（无回环）
const nodeNames = new Set(out.proxies.map(p => p.name));
const groupNames = new Set(groups.map(g => g.name));
const utGroups = groups.filter(g => g.type === "url-test" && g.name.endsWith("-自动选择"));
let ok = 0, fail = 0;
for (const g of utGroups) {
  const hasFb = g.proxies[g.proxies.length - 1] === "兜底-自动选择";
  const allNodes = g.proxies.every(p => nodeNames.has(p) || p === "兜底-自动选择");
  if (hasFb && allNodes) ok++; else { fail++; console.log(`❌ [${g.name}] proxies=${JSON.stringify(g.proxies)}`); }
}
console.log(`✅ 地区自动选择组 ${utGroups.length} 个，全部末尾含兜底成员且无回环: ${ok} 通过 / ${fail} 失败`);

// 3) 兜底组自身 proxies 全是节点（无组引用 → 无回环）
const fbAllNodes = fb.proxies.every(p => nodeNames.has(p));
console.log(fbAllNodes ? "✅ 兜底组只含节点，无回环" : "❌ 兜底组含非节点引用");

// 4) GLOBAL 不含兜底组
const globalG = byName["GLOBAL"];
console.log(globalG && !globalG.proxies.includes("兜底-自动选择") ? "✅ GLOBAL 不含兜底组" : "❌ GLOBAL 异常");

// 5) 兜底组被引用但没有被误当节点过滤
console.log(`✅ 生成: ${out.proxies.length} 节点 | ${groups.length} 组 | ${out.rules.length} 规则`);
console.log(`   规则引用全部存在: ${out.rules.every(r => { const p = r.split(","); const ref = p[p.length-1] === "no-resolve" ? p[p.length-2] : p[p.length-1]; return ["REJECT","DIRECT","PASS","REJECT-DROP"].includes(ref) || groupNames.has(ref); }) ? "✅" : "❌"}`);
