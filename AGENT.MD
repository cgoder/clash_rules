# Agent Guide

## Project Scope

This repository maintains Clash Meta / Mihomo configuration files, custom rule
lists, and small helper scripts for validating subscription node coverage.

Important files:

- `clashmi.yml`: primary full configuration.
- `clashmi_LB.yml`: load-balance focused configuration.
- `clashmi_optimized.yml`: alternate optimized configuration.
- `override.yml`: simplified standalone main configuration based on
  `clashmi.yml`; it must not contain embedded node sources.
- `rules/my_direct.list`: custom direct rules.
- `rules/my_proxy.list`: custom proxy rules.
- `scripts/validate_subscription.sh`: helper for checking node grouping.

## Command Conventions

- Always prefix shell commands with `rtk`.
- For PowerShell cmdlets, use:

```powershell
rtk powershell -NoProfile -Command "<command>"
```

- Prefer `rg` or `rg --files` for searching when available.
- Keep command output concise and focused on the files being changed.

## Configuration Rules

- Keep YAML compatible with Clash Meta / Mihomo.
- Do not commit real subscription URLs, tokenized URLs, node credentials, or
  other private proxy data.
- Do not add subscription placeholders such as `your-subscription-url` or
  similar template secrets.
- Do not add `proxy-providers` to `override.yml`; that file depends on clients
  or external subscription conversion to merge nodes into the profile.
- Keep `override.yml` usable as a simplified standalone main config, not as a
  patch fragment.
- In `override.yml`, regional and automatic groups should select from merged
  nodes with `include-all: true` plus filters instead of provider references.
- Preserve the DNS anti-deadlock pattern: domestic plain DNS is used for startup
  and proxy node resolution, while overseas or sensitive service DNS can be
  routed through proxy-aware policy.
- Preserve custom rule priority: local ad/private handling first, then custom
  proxy/direct rules, service groups, overseas fallback, domestic direct rules,
  and final `MATCH`.

## Editing Guidelines

- Keep edits scoped to the requested config, rule, script, or documentation.
- When changing policy groups, ensure every group referenced by `rules` exists
  in `proxy-groups`.
- When changing `RULE-SET` entries, ensure every referenced provider exists in
  `rule-providers`.
- Keep rule-provider names stable unless every reference is updated together.
- Keep rule list files plain text, one rule per line.
- Avoid broad formatting churn in YAML files; it makes config review harder.

## Validation Checklist

Before finishing changes, run the checks that apply:

```powershell
rtk git diff --check
rtk powershell -NoProfile -Command "git status --short"
```

For `override.yml`, also confirm:

- No `proxy-providers` section exists.
- No real or placeholder subscription URL was introduced.
- All policy groups referenced by rules are defined.
- All `RULE-SET` providers referenced by rules are defined.
- `Auto`, `HK`, `Asia`, `NorthAmerica`, and `Europe` keep `include-all: true`.

If a Mihomo or Clash binary is available, validate the edited profile with the
available binary, for example:

```powershell
rtk mihomo -t -f override.yml
```

If the binary is not available, state that only static validation was performed.
