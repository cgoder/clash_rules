// 临时验证脚本：验证 clashmi_flclash.js 的环视正则 + 完整 main 流程
const fs = require("fs");
const path = require("path");
const src = fs.readFileSync(path.join(__dirname, "../../clashmi_flclash.js"), "utf8");
// 屏蔽 console.log 噪音
const origLog = console.log;
console.log = () => {};
eval(src + "; globalThis.__RE=RE; globalThis.__isOther=isOtherRegion; globalThis.__main=main;");
console.log = origLog;

const RE = globalThis.__RE;
const isOther = globalThis.__isOther;
const mainFn = globalThis.__main;

// 1) 环视正则边缘用例
const cases = [
  // [节点名, 期望匹配的组]
  ["HK01 | 1x", "HK"],
  ["东京JP-01", "JP"],
  ["香港-01", "HK"],
  ["JPN 大阪", "JP"],
  ["纽约节点", "US"],
  ["🇺🇸 洛杉矶", "US"],
  ["USA-01", "US"],
  ["Singapore 01", "SG"],
  ["台北-01", "TW"],
  ["Korea 首尔", "AS"],
  ["DE-01 法兰克福", "EU"],
  ["巴西 BR-01", "AM"],
  ["香港01", "AS"],
  ["群|返利节点", null], // 噪音，应被过滤
];
let pass = 0, fail = 0;
for (const [name, expect] of cases) {
  const matched = [];
  for (const k of ["HK","TW","SG","JP","US","AS","EU","AM"]) if (RE[k].test(name)) matched.push(k);
  const ok = expect === null ? matched.length === 0 : matched.includes(expect);
  // 检查非预期匹配到 OT 的问题
  const ot = isOther(name);
  if (ok && expect !== null && ot) { console.log(`❌ [${name}] 匹配了${matched.join("/")} 但也被 isOtherRegion 判定为其他 → 冲突`); fail++; continue; }
  if (ok) { pass++; } else { console.log(`❌ [${name}] 期望 ${expect}，实际 [${matched.join(",")}], isOther=${ot}`); fail++; }
}
console.log(`\n== 正则用例: ${pass} 通过 / ${fail} 失败 ==`);

// 2) 完整 main 流程（含噪音节点 + 空地区）
const mockConfig = {
  proxies: [
    { name: "香港 HK01", type: "ss", server: "1.1.1.1" },
    { name: "东京JP-01", type: "ss", server: "1.1.1.2" },
    { name: "纽约节点", type: "ss", server: "1.1.1.3" },
    { name: "新加坡 SG 01", type: "ss", server: "1.1.1.4" },
    { name: "德国 DE-01", type: "ss", server: "1.1.1.5" },
    { name: "群|返利|官网", type: "ss", server: "1.1.1.6" },  // 噪音
    { name: "台湾 台北", type: "ss", server: "1.1.1.7" },
    { name: "英国 UK-01", type: "ss", server: "1.1.1.8" },
    { name: "非洲节点-1", type: "ss", server: "1.1.1.9" },   // 其他
  ],
  dns: {},
};
try {
  const out = mainFn(mockConfig);
  const groups = out["proxy-groups"];
  console.log(`生成: ${out.proxies.length} 节点(含${out.proxies.filter(p=>p.type==='direct').length}直连) | ${groups.length} 组 | ${out.rules.length} 规则`);
  // 检查各区域组内容
  for (const g of groups) {
    if (["香港负载均衡","香港速度优先","日本负载均衡","美国负载均衡","亚洲手动","欧洲手动","美洲手动","其他手动"].includes(g.name)) {
      console.log(`  [${g.name}] -> ${JSON.stringify(g.proxies)}`);
    }
  }
  // 校验：规则引用的组都存在
  const gnames = new Set(groups.map(g=>g.name));
  const missing = [];
  for (const r of out.rules) {
    const parts = r.split(",");
    const ref = parts[parts.length-1];
    if (["REJECT","DIRECT","PASS","REJECT-DROP"].includes(ref)) continue;
    if (!gnames.has(ref) && ref !== "一键代理" && ref !== "国内直连" && ref !== "ChatGPT" && ref !== "Claude" && ref !== "Gemini" && ref !== "流媒体" && ref !== "通信" && ref !== "云服务" && ref !== "金融" && ref !== "Apple" && ref !== "OneDrive" && ref !== "Microsoft" && ref !== "漏网之鱼") missing.push(r);
  }
  // 更简单：直接检查所有规则引用的组（no-resolve 是后缀，组名取倒数第 1 或 2 段）
  const allRefs = new Set(out.rules.map(r => {
    const parts = r.split(",");
    return parts[parts.length-1] === "no-resolve" ? parts[parts.length-2] : parts[parts.length-1];
  }));
  const realMissing = [...allRefs].filter(ref => !["REJECT","DIRECT","PASS","REJECT-DROP"].includes(ref) && !gnames.has(ref));
  if (realMissing.length) console.log(`❌ 规则引用了不存在的组: ${realMissing.join(",")}`);
  else console.log("✅ 所有规则引用的策略组都存在");
  // 校验 sniffer/tun/hosts/gfw
  console.log(`sniffer: ${out.sniffer ? "✅ enable="+out.sniffer.enable+" force-domain="+out.sniffer["force-domain"].length : "❌ 缺失"}`);
  console.log(`tun: ${out.tun ? "✅ EIM="+out.tun["endpoint-independent-nat"]+" mtu="+out.tun.mtu : "❌ 缺失"}`);
  console.log(`hosts: ${Object.keys(out.hosts).length} 条 (${Object.keys(out.hosts).includes("+.mcdn.bilivideo.com") ? "含B站PCDN屏蔽 ✅" : "缺PCDN ❌"})`);
  console.log(`rules 含 gfw 兜底: ${out.rules.includes("RULE-SET,gfw,一键代理") ? "✅" : "❌"}`);
  console.log(`rule-providers 含 gfw: ${out["rule-providers"].gfw ? "✅" : "❌"}, adblock(应被删): ${out["rule-providers"].adblock ? "❌ 应默认删除" : "✅ 已按默认关闭删除"}`);
} catch (e) {
  console.log("❌ main 抛错: " + e.message);
}
