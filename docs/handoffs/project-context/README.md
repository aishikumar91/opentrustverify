# Project context dumps

Snapshots of this monorepo produced by [context-builder](https://github.com/igorls/context-builder) (v0.10.0). Config lives at the repo root: `context-builder.toml`.

Agent-facing distillation is `AGENTS.md` at the repo root. Prefer that over pasting a full dump into a coding agent. Use a dump when you need a one-shot review (Deep Think / large-context pass).

## What was measured (2026-09-01)

| Mode | Tokens (o200k_base) | Typical file |
|---|---|---|
| Filtered full tree | 128,631 | exceeds 128k warning |
| `--max-tokens 120000` | ~120k | `00-context_*.md` (~469 KB), truncated |
| `--signatures --structure` on ts/tsx/dart/py/sql | 20,126 | `01-signatures_*.md` (~75 KB) |

Filters: `ts, tsx, js, mjs, cjs, sql, yml, yaml, toml, md, dart, py, css`.

Ignored by name: `node_modules`, `dist`, `build`, `coverage`, `target`, `.git`, `brand`, `keys`, `wiki-vault`, lockfiles, `handoffs`.

`.gitignore` still applies, so `.env` and `keys/*.pem` stay out. Binary PNG/SVG under `brand/` are out. Timestamped dumps are gitignored so the repo does not store a second copy of the tree.

## Regenerate

Windows binary used here:

`%LOCALAPPDATA%\Programs\context-builder\context-builder.exe`

```bash
context-builder --preview
context-builder --token-count
context-builder --max-tokens 120000 -y -o docs/handoffs/project-context/00-context.md
context-builder --signatures --structure -f ts -f tsx -f dart -f py -f sql -y -o docs/handoffs/project-context/01-signatures.md
```

`timestamped_output` and `auto_diff` are on. A second run writes a new timestamped file plus a change summary. `--diff-only` omits full file bodies.

If diffs look stale: `context-builder --clear-cache`.
