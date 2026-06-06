# AKALYNTH_FORUM_PGP_IDENTITY_SEAL_V1

Generated: 2026-06-06T19:33:16Z

## Lane

- Lane id: `AKALYNTH_FORUM_PGP_IDENTITY_SEAL_V1`
- Target: `forum_identity_signing_layer_for_authority_bearing_posts_without_blocking_basic_chat`
- Repository: `akalynth/akalynth-site`
- Branch: `codex/forum-pgp-identity-seal-v1`
- Base branch: `main`
- Base SHA: `b2a624fca628b7c5d1594a154e155918ebe792a5`
- Pre-receipt tree SHA: `1f418fa83a19ec9ee588dc2d708ac81e0e650abf`

## Policy Implemented

- Public forum read: no account required.
- Basic forum chat: Akalynth preview character identity required.
- Authority-bearing trade board posting: preview Identity Seal required.
- Official seed posts from Warden, Steward, and Chronicler figures: marked with `Project-signed` policy badges.
- Badge glossary added for `Unsigned`, `Key-bound`, `Signed`, and `Project-signed`.
- The claim is bounded to key-controlled authorship continuity policy. It does not claim the user is trusted.

## Static Boundary

This lane does not implement live PGP verification.

- No backend added.
- No API calls added.
- No network calls added.
- No account/session authority added.
- No private keys added.
- No detached signature parser or verifier added.
- No server-side moderation, marketplace, governance, or guild authority added.
- Browser-local `localStorage` is used only to preview a public-key fingerprint binding.

## Changed Files

- `forum.html`
- `js/forum.js`
- `css/style.css`
- `PUBLIC_BOUNDARY.md`
- `PRE_ALPHA_NOTICE.md`
- `docs/receipts/AKALYNTH_FORUM_PGP_IDENTITY_SEAL_V1.md`
- `docs/receipts/AKALYNTH_FORUM_PGP_IDENTITY_SEAL_V1.json`
- `docs/receipts/AKALYNTH_FORUM_PGP_IDENTITY_SEAL_V1.MANIFEST.sha256`

## Validation

- `node --check js/forum.js`: passed.
- `scripts/check-static-site.sh`: passed.
- `scripts/check-public-boundary.sh`: passed.
- `git diff --check`: passed.
- `npm test`: not_present, no `package.json`.
- `npm run build`: not_present, no `package.json`.
- `npm run lint`: not_present, no `package.json`.
- `npm run health`: not_present, no `package.json`.

## No-Deploy Statement

No deploy, merge, Pages, DNS, CDN, backend, runtime, account, payment, entitlement, marketplace settlement, governance authority, or API work was performed in this lane.
