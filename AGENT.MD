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

If a Mihomo or Clash binary is available, validate any edited profile directly:

```bash
mihomo -t -f clashmi.yml
```

If the binary is not available, state that only static validation was performed.
