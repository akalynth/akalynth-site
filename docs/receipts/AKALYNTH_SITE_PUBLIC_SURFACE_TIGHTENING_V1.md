# AKALYNTH_SITE_PUBLIC_SURFACE_TIGHTENING_V1

## Status

Applied on branch `codex/site-public-surface-boundary-v1`. Validation commands below
were run against the working tree before commit.

## Repository

- Repository: `akalynth/akalynth-site`
- Base branch: `main`
- Base commit (branch point): `b2a624fca628b7c5d1594a154e155918ebe792a5`
  ("visual: build Akalynth public site from asset pack")
- Branch: `codex/site-public-surface-boundary-v1`

## Scope

This patch tightens the public static site boundary language.

In scope:

- Replace login-like public copy with browser-local preview-character copy.
- Clarify that account-gated surfaces are local preview gates only.
- Clarify that the Android beta download points to a current public artifact,
  not a dynamic live account or entitlement lane.
- Extend the public-boundary check script to reject future login-like wording.

Out of scope:

- No deploy.
- No merge automation.
- No DNS, Pages, CDN, hosting, or APK hosting change.
- No game server, runtime state, account authority, payment processing,
  entitlement, house settlement, auction, anti-cheat, receipt authority, or
  verifier implementation change.

## Changed surfaces

- `beta.html`
- `shop.html`
- `houses.html`
- `forum.html`
- `js/app.js`
- `js/forum.js`
- `PRE_ALPHA_NOTICE.md`
- `scripts/check-public-boundary.sh`

## Boundary assertion

The site remains a static public preview. A preview character is a
browser-local object stored in localStorage. It is not authentication, account
authority, entitlement authority, server identity, live game state, or proof of
ownership.

## Validation commands

Run before commit:

```bash
scripts/check-public-boundary.sh
scripts/check-static-site.sh
git diff --check
```

Expected result:

- Public boundary checks pass.
- Static site smoke test passes.
- No whitespace or patch formatting errors.

## Release blockers

Do not merge if any changed public copy implies:

- real login
- real account creation
- live payment processing
- live entitlement creation
- ownership verified server-side
- live auction settlement
- server-backed state
- verifier-backed receipts

without naming the actual server authority, receipt artifact, verifier path, and
release proof.
