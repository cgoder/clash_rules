# Agent Guide

## Project Scope

This repository maintains Clash Meta / Mihomo configuration files, custom rule
lists, and small helper scripts.

At a glance:

- `clash.js`: the primary configuration, consumed by clients that support JS
  overrides. Loads a subscription profile, normalizes and filters nodes, then
  generates policy groups and rules. This is the source of truth for routing
  logic.
- `clashmi.yml`: the same routing logic expressed as static YAML, for clients
  that cannot run the JS override. **It must stay logically identical to
  `clash.js`** — same group names, same rule order, same providers, same health
  check parameters. It is generated from `clash.js` constants; do not hand-edit
  its routing sections.
- `scripts/gen_clashmi.mjs`: regenerates `clashmi.yml` from `clash.js`.
- `scripts/check_config_sync.mjs`: verifies the two stay in sync. **Run this
  after changing either file.**
- `clashmi_lite.js`, `clashmi_flclash.js`, `mihomoScript_clashmi_fused.js`:
  alternative override scripts derived from `clashmi.yml` and third-party
  bases. They are older than `clash.js` and are not kept in lockstep with it.
  Check before assuming a fix in `clash.js` applies here.
- `ss.conf`: Shadowrocket config, a port of `flclash.js` to the `.conf`
  format. See Configuration Rules for its platform gaps and validation.
- `flclash.js`: a revised third-party generator script with its own naming
  scheme (节点选择 / AI专线 / 亚太智能优选) and rule set. It is unrelated to
  `clash.js` and is not checked by `scripts/check_config_sync.mjs`. It carries
  its own SideStore baseline (`tun.loopback-address: 10.7.0.1` plus the three
  Apple auth domains as explicit rules ahead of `apple-cn`), verified by
  `scripts/check_flclash.mjs`. Validate with `mihomo -t` against both an
  empty-proxy and a single-US-node sample after any edit.
- `rules/my_direct.list`: custom direct rules.
- `rules/my_proxy.list`: custom proxy rules (also carries the Apple
  authentication domains required by SideStore / LiveContainer).
- `scripts/test_clash_js.mjs`: regression tests for `clash.js`.
- `icons/`: icon assets referenced by the configurations.

## Command Conventions

- Run shell commands directly (no wrapper prefix).
- Prefer `rg` or `rg --files` for searching when available.
- Keep command output concise and focused on the files being changed.

## Configuration Rules

- Keep YAML compatible with Clash Meta / Mihomo.
- Do not commit real subscription URLs, tokenized URLs, node credentials, or
  other private proxy data.
- Do not add subscription placeholders such as `your-subscription-url` or
  similar template secrets.
- Preserve the DNS anti-deadlock pattern: domestic plain DNS is used for startup
  and proxy node resolution, while overseas or sensitive service DNS can be
  routed through proxy-aware policy.
- Preserve custom rule priority: local ad/private handling first, then custom
  proxy/direct rules, service groups, overseas fallback, domestic direct rules,
  and final `MATCH`.
- Never put a rule after `MATCH`; anything below it is unreachable.
- `clash.js` and `clashmi.yml` must keep the same routing semantics: group
  names, group types, `default-selected`, rule order, rule-provider names and
  URLs, and health-check parameters. When you change routing logic in one,
  change it in the other and re-run `scripts/check_config_sync.mjs`.
- `clashmi.yml` is generated. Edit `scripts/gen_clashmi.mjs` (or `clash.js`)
  and regenerate, rather than editing the YAML routing sections by hand.
- Scenario groups are split by intent: proxy-type groups (AI, Google, YouTube,
  OneDrive, GitHub) must not contain a direct exit; direct-type groups
  (Microsoft, Apple) keep `国内直连` as their default. Do not merge the two.
- The `AI` group is a `fallback` group, not `url-test`. Its default egress is
  the first member (`美国-自动选择`), so member order is the failover order and
  it must not carry `default-selected`. AI services are sensitive to both
  connection resets and egress IP churn; do not switch it back to `url-test`.
- AI routing uses the MetaCubeX aggregate `category-ai-chat-!cn` ruleset rather
  than per-vendor rulesets, so new AI services are picked up automatically.
- Region groups are **reusable grouping structures, not per-consumer
  components**. In `flclash.js` / `ss.conf` the same 台湾节点 / 新加坡节点 /
  日本节点 / 韩国节点 / 美国节点 groups are referenced by `节点选择`,
  `研发加速`, `流媒体服务` and `AI专线` alike. Do not create consumer-scoped
  duplicates such as `AI-美国`; that doubles the group count and lets two
  regexes drift apart.
- `AI专线` in `flclash.js` / `ss.conf` is a two-layer structure: a flat
  cross-region `AI自动选择` url-test plus the existing region groups. Its
  member list must contain **groups only, never bare node names** — the AI
  pool's entry condition is "matches exactly one region label", so every AI
  node is already reachable through a region group (verified: the set of AI
  nodes not covered by the region groups is empty). Appending bare names made
  each node appear twice in the panel.
- Manual pinning differs by group type, and this is load-bearing:
  - `select` (e.g. `AI专线`): a pin sticks to the chosen member even after it
    dies. Traffic black-holes until the user re-picks.
  - `url-test` / `fallback` (region groups): a pin is *soft*. `URLTest.fast()`
    honours it only while the node is alive and silently falls back to the
    fastest alive member otherwise; the pin re-applies when the node recovers.
    `Fallback` instead clears `selected` permanently once the pinned node dies.
  Prefer region-group pinning for AI traffic (streaming needs auto-degrade),
  and never describe it to users as an unconditional lock.
- A group-level delay test **erases** a pin on any non-`Selector` group:
  `hub/route/groups.go` calls `ForceSet("")` and
  `cachefile.Cache().SetSelected(name, "")` for every `SelectAble` group whose
  `Type()` is not `Selector`. Telling a user to "test the group" after pinning
  a node in a region group silently undoes the pin.
- The AI pool's banned-label exclusion (香港/港/澳门/俄/中国/大陆 + HK/MO/RU/CN)
  lives in `AI自动选择` itself, not in the region groups. Generic region groups
  deliberately do **not** carry it, so they admit transiting nodes such as
  「香港中转 美国 01」 that the AI pool rejects. Keep that asymmetry: region
  groups answer "all nodes in this country", the AI pool answers "nodes whose
  exit country is knowable from the name". Do not "fix" the region groups to
  match the AI pool, and do not route AI rules at them without understanding
  that transit nodes can be selected inside them.
- Cloudflare key subdomains (`challenges.cloudflare.com`, `workers.dev`,
  `pages.dev`, `cdnjs`, `static.cloudflareinsights.com`) are routed via
  `默认代理` and must stay ahead of `cn_domain`; their DNS often resolves to
  unreachable prefixes from mainland networks.
- `rules/my_proxy.list` and `rules/my_direct.list` use `behavior: classical`,
  where mihomo only honours domain rules. Never add `IP-CIDR` / `GEOIP` entries
  there; they are silently ignored.
- `dns.default-nameserver` must contain plain IPs per the official docs. Do not
  re-add `system`. `proxy-server-nameserver` may keep `system` as last resort.
- mihomo **silently ignores unknown keys**. A typo such as `route-exclude-cidr`
  (correct: `route-exclude-address`) loads without error but has no effect.
  Never assume a TUN/DNS key works because the profile loads; verify it.
  `scripts/check_config_sync.mjs` whitelists TUN keys and flags unknown ones.
- `ss.conf`: Shadowrocket config produced by porting `flclash.js` to the
  `.conf` format. Shared group names, rule order and the `AI专线` member
  structure, minus what the platform cannot do (no loopback reflection, no
  PROCESS-NAME rules, no include-all group, no `empty-fallback`). Validate
  with `scripts/check_ss_conf.mjs`; add `--remote` to verify the 12 rule-set
  URLs actually contain rule types.
- `tun.loopback-address` is `10.7.0.1` for SideStore / LiveContainer re-signing.
  Never add `10.0.0.0/8`, `10.7.0.0/24` or `10.7.0.1/32` to
  `route-exclude-address`; doing so removes the loopback from TUN and breaks
  re-signing. Both `scripts/check_config_sync.mjs` and
  `scripts/check_flclash.mjs` validate this.
- Apple auth domains (`gsa.apple.com`, `developerservices2.apple.com`,
  `gspe1-ssl.ls.apple.com`) need explicit proxy rules ahead of `apple-cn`.
  Relying on `geolocation-!cn` to pick them up works today only because the
  upstream ruleset happens to contain them; it is not a guarantee.

## Editing Guidelines

- Keep edits scoped to the requested config, rule, script, or documentation.
- When changing policy groups, ensure every group referenced by `rules` exists
  in `proxy-groups`.
- When changing `RULE-SET` entries, ensure every referenced provider exists in
  `rule-providers`.
- Keep rule-provider names stable unless every reference is updated together.
- Keep rule list files plain text, one rule per line.
- Avoid broad formatting churn in YAML files; it makes config review harder.
- In `clash.js`, policy group `default-selected` must always name a real member
  of that group. mihomo silently falls back to the first member when it does
  not, which changes routing without any error.
- In `clash.js`, a node name must not collide with `DIRECT`, `REJECT`, `PASS`,
  `COMPATIBLE`, `GLOBAL`, the injected `DIRECT | 仅IPv4` proxy, or any policy
  group name. mihomo fails the whole profile with a duplicate-name error.
- In `flclash.js`, node names are deduplicated against `GROUP_ORDER` and
  `FIXED_GROUP_NAMES`. If you add a generated group, add its name to
  `FIXED_GROUP_NAMES` too, otherwise a subscription node with the same name
  collides and mihomo rejects the whole profile.
- When `flclash.js` and `ss.conf` both need a routing change, apply it to both
  in the same commit. Their AI layers have drifted apart before; keep the group
  names, member order and AI-layer semantics aligned unless the platform gap
  makes it impossible, and record any deliberate divergence in `ss.conf`'s
  file header.

## Validation Checklist

Before finishing changes, run the checks that apply:

```bash
git diff --check
git status --short
```

For changes to `clash.js` or `clashmi.yml`, run both checks:

```bash
node scripts/test_clash_js.mjs      # clash.js 行为回归
node scripts/check_config_sync.mjs  # 两份配置逻辑一致性
```

Add `MIHOMO=1` to also validate generated profiles with the kernel:

```bash
MIHOMO=1 node scripts/test_clash_js.mjs
```

For changes to `flclash.js` or `ss.conf`:

```bash
node scripts/check_flclash.mjs       # flclash.js 静态检查（9 项）
MIHOMO=1 node scripts/check_flclash.mjs  # 额外跑 mihomo -t
node scripts/check_ss_conf.mjs       # ss.conf 静态检查（9 项）
node scripts/check_ss_conf.mjs --remote  # 额外验证 12 个远程规则集内容
```

`flclash.js` 的 `mihomo -t` 除探针样本外，还要额外验空配置与单美国节点
两份样本（`check_flclash.mjs` 只覆盖探针）。

If a Mihomo or Clash binary is available, validate any edited profile directly:

```bash
mihomo -t -f clashmi.yml
```

If the binary is not available, state that only static validation was performed.
