# Akalynth site: agent instructions

Instructions for coding agents working in `akalynth/akalynth-site`.

This repo is the public static website and Android companion portal for
Akalynth: hand-written HTML, CSS, and JavaScript plus public-safe assets, with
no build step. The game is a pre-alpha vertical slice; never describe it as
production, content-alpha, or launched. The game server, Android client, APK
releases, and the site publisher live in `akalynth/akalynth`.

## Skills

Skills live in `.agents/skills/<name>/SKILL.md`.

| Skill | Use for |
| --- | --- |
| [`site-steward`](.agents/skills/site-steward/SKILL.md) | Any change, check, or publish handoff in this repo, including APK download links and the release inspector |

How each tool finds them:

- Cursor and Codex read `.agents/skills/` directly.
- Claude Code reads them through the `.claude/skills` symlink.
- Grok reads them through the `.grok/skills` symlink; `./.grok/skills/` is the project path in Grok's skills docs.
- `.cursorignore` lists both symlinks so Cursor indexes each skill once.

Claude Code reads this `AGENTS.md` only when there is no `CLAUDE.md` or
`CLAUDE.local.md` in the working directory or above (`.claude/CLAUDE.md` counts
as a `CLAUDE.md`), and only on Claude Code 2.1.277 or later.

A new skill gets its own folder, with `name` equal to the folder name, a short
description that leads with when to use it, and `metadata.version`. Use only
Agent Skills spec frontmatter fields so `skills-ref validate` passes.

## Verify

```bash
./scripts/verify-account-character-site.sh
git diff --check
```

CI runs the same script (`.github/workflows/site-checks.yml`) on every pull
request and on push to `main`.

## Rules

- No deploy, publish, DNS, or host changes from this repo. The operator publishes an exact reviewed commit from `akalynth/akalynth`; your handoff is a reviewed PR and, after merge, its commit SHA.
- Don't edit or trigger `.gitea/workflows/ship-beta.yml`.
- `/download/` (APK and checksum) is a separate artifact lane. Link only to the immutable versioned filename, and never invent release facts.
- Rendered site copy carries no release-stage words; the checks enforce it.
- No server or Android code, secrets, host paths, deployment or payment config, or private roadmap. `scripts/check-public-boundary.sh` scans every tracked file, these agent files included.
- Don't weaken a check to make a change pass. When pinned copy changes, change its check in the same commit.
- Contributions are maintainer-requested only (`CONTRIBUTING.md`). Fill in `.github/PULL_REQUEST_TEMPLATE.md`.
