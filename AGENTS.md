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

Cursor and Codex load `.agents/skills/` directly. Claude Code loads it through
the `.claude/skills` symlink, and reads this file only when no `CLAUDE.md`,
`.claude/CLAUDE.md`, or `CLAUDE.local.md` exists in the working directory or
above (Claude Code v2.1.277 or later). Grok reads this file, but its documented
project skill folder is `.grok/skills/`, which this repo does not ship, so Grok
skill loading is unproven. `.cursorignore` hides the symlink so Cursor indexes
each skill once.

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
