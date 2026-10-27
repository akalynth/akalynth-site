---
name: site-steward
description: Use for any akalynth-site change, check, or publish handoff — static pages, js/app.js API calls, Android APK download and checksum links, the release inspector, public-boundary copy, or the site check scripts. Covers the no-build layout, the one verifier, who publishes, and APK custody.
compatibility: The site checks need git, bash, python3, node, curl, and sha256sum, and use no network beyond 127.0.0.1.
metadata:
  version: "0.1.0"
---

# Site steward

`akalynth/akalynth-site` is the public static website and Android companion
portal for Akalynth. The game is a pre-alpha vertical slice; never describe it
as production, content-alpha, or launched. This repo holds hand-written HTML,
CSS, JavaScript, public-safe assets, and the checks that guard them. The game
server, Android client, APK builds and signing, release records, and the site
publisher live in `akalynth/akalynth`, where `deploy-steward` owns publish
custody and `android-client` owns the APK.

## Hard limits

- No deploy, publish, DNS, CDN, or host change from this repo, and never start a publish workflow or host service. Pushing to `main` or `beta` and merging belong to maintainers.
- Never add, move, rename, or rewrite anything under `/download/`. It is a separate artifact lane.
- Never invent APK facts (digest, size, version, signer, source commit). Copy them from a release record a maintainer or the operator names, or leave them out.
- Never weaken or delete a check to make a change pass.
- No server or Android code, secrets, host paths, deployment or payment config, or private roadmap (`CONTRIBUTING.md`, `PUBLIC_BOUNDARY.md`).

## How the site is built

There is no build step: no package manager, bundler, transpiler, or generated
output. The repo root is the site root. Pages load `css/`, `js/`, and `assets/`
by relative path; only `/download/` links are root-absolute.

| Path | Role |
| --- | --- |
| `index.html` | Landing and High City presentation |
| `download.html` | Direct APK, checksum, install steps, release inspector |
| `houses.html`, `market.html`, `shop.html` | Housing explainer, House Registry, Coin Exchange with the non-live Patron proposal |
| `account.html` | Account and character portal (`#account-portal-root`) |
| `register.html`, `forgot.html` | Entry routes into `account.html?view=register` and `?view=forgot` |
| `community.html`, `support.html` | Read-only boards; FAQ and copy-only diagnostics |
| `library.html`, `wallpapers.html` | Public lore archive and wallpapers |
| `beta.html`, `forum.html` | Compatibility redirects to `download.html` and `community.html` |
| `js/app.js` | Shared behaviour on every content page: API calls, action guards, release binding |
| `js/forum.js`, `js/support.js` | Board renderer and diagnostics helper; the checks bar both from network and storage APIs |
| `js/codex-library.js`, `js/codex-public.graph.json` | Library archive and the public graph it loads |
| `css/` | `style.css`, `fonts.css` (self-hosted Cinzel and Inter), `theme-dark.css`, `theme-android.css` |
| `assets/akalynth/visuals/<class>/` | WebP banners, cards, thumbs, wallpapers, og, hero, icons |
| `assets/codex/` | PNG lore plates used by the library and home page |
| `docs/receipts/` | Lane receipts; `*.MANIFEST.sha256` files are re-checked |

API origin in `js/app.js`: `window.AKALYNTH_API_BASE` wins; on `localhost` or
`127.0.0.1` it is `http://127.0.0.1:3000`; on `beta.`, `staging.`, or `sim.`
lane hosts it is the same origin's `/v1`; otherwise it is the public API host,
which the code assembles from string pieces so the boundary grep never sees the
literal hostname. Keep it assembled.

Visual derivatives: `scripts/build-visual-hero-icon-gaps.sh` rebuilds the hero
and icon WebPs that lanes were missing from existing banners and cards, using
`ffmpeg`. It overwrites the committed outputs, so run it only when derivatives
need rebuilding and review the binary diff. Record a receipt in
`docs/receipts/` as `AKALYNTH_WEBSITE_HERO_ICON_GAP_FILL_V1.md` did. If you
edit a receipt that a manifest covers, regenerate that manifest in the same
change.

Local preview: `python3 -m http.server 8099` from the repo root, then open
`http://127.0.0.1:8099/`. On loopback the portal calls `http://127.0.0.1:3000`.
Don't point a preview at a live API to send account, shop, work, or property
mutations; `design-qa.md` used intercepted, source-shaped fixtures and sent no
live mutation.

## Verify

One command is the gate, locally and in CI:

```bash
./scripts/verify-account-character-site.sh
git diff --check
```

The script syntax-checks the check scripts, confirms
`.github/workflows/site-checks.yml` still calls it, then runs the three checks
below. CI runs it on every pull request and on push to `main`, on GitHub-hosted
`ubuntu-24.04`.

| Check | What it enforces |
| --- | --- |
| `scripts/check-static-site.sh` | Required pages exist and serve on loopback (`AKALYNTH_SITE_TEST_PORT`, default 8099); the removed Codex surface stays absent and unlinked; every API route, guard, and message string it pins in `js/app.js`; APK link canonicality and binding; Android-only copy; receipt manifests; local link targets |
| `scripts/check-public-boundary.sh` | Governance files exist with their pinned sentences; no host paths, server paths, API hostname literal, secret patterns, or forbidden claim phrases in **any tracked file** other than the check and the CI workflow, this skill included; no generated, runtime, or archive artifacts |
| `scripts/verify-site-e2d-character-gameplay.mjs` | Runs `js/app.js` in a Node `vm` with mocked `fetch` through `window.__AKALYNTH_SITE_E2D_TEST_HOOKS__`; proves request bodies, no-session and no-CSRF refusal, server catalog and market authority, and the release-record rules |

Coupling to respect:

- The checks pin exact strings in `js/`, the pages, the E2D verifier, `README.md`, `PUBLIC_BOUNDARY.md`, `PRE_ALPHA_NOTICE.md`, `SECURITY.md`, and `AKALYNTH-PORTAL-EXPANSION-SPEC.md`. Rewording one of those means changing the copy and its check together, on purpose.
- Guard and refresh checks count lines. Each mutation `api(...)` call needs its `accountActionBlockedMessage` or `accountCharacterActionBlockedMessage` guard within the 10–16 lines above it. Shop and property mutations also need their post-acceptance reload and `endMutation(...)` within the 30–35 lines after the call. A refactor that spreads them apart fails.
- The E2D verifier calls functions through the test hooks at the end of `js/app.js`. Rename one and you must update both.

## How the site is published

This repo does not deploy itself (`README.md`). The operator publisher in
`akalynth/akalynth` publishes one exact reviewed site commit that the operator
names, to the public site at `akalynth.com`. The publish-time APK identity guard
also lives there, owned by `deploy-steward`.

Your handoff ends at a reviewed pull request:

1. The verifier passes locally and in `site-checks`.
2. The PR body says what changed. If APK links moved, it names the artifact the fallback points at and says that artifact must already be in `/download/` before publish.
3. After a maintainer merges, report the merged 40-character commit SHA. Whether and when to publish it is the operator's decision.

`/download/` is served beside the site but is not part of it. APK and checksum
files never live in this repo, and the link check skips `/download/` paths, so
nothing here can prove an artifact exists.

`.gitea/workflows/ship-beta.yml` is a host-side Gitea Actions workflow: on push
to `main` or `beta`, a self-hosted `ship-akalynth` runner starts the host's
beta-lane publish service and waits for its result. GitHub does not run
`.gitea/workflows/`, and nothing in this repo shows whether a Gitea mirror
still runs it. Don't edit, trigger, or copy it; send publish questions to the
operator.

## APK distribution custody

The site distributes one thing, the direct APK, and never vouches for bytes it
does not host. The static check enforces rules 1 and 2. `validAndroidRelease`
in `js/app.js` enforces rules 3–5 at runtime, and the E2D verifier and static
check pin their key parts: the credential-free fetch, the Akalynth host, and
all-or-nothing provenance.

1. Static links use only the immutable versioned filename pinned as `canonical_apk` in `scripts/check-static-site.sh` (`/download/akalynth-beta-vN.apk`) and its `.sha256`. The unversioned alias, other hosts, F-Droid, and browser play are forbidden.
2. Every APK `<a>` carries `data-android-download` and every checksum `<a>` carries `data-android-checksum`, so the runtime binding can rewrite them.
3. `js/app.js` first renders the checked-in `ANDROID_RELEASE_FALLBACK`, then fetches `GET /v1/client/android-update?lane=prod` with `credentials: "omit"` and `cache: "no-store"`. Only a record that passes `validAndroidRelease` rewrites the links and the `download.html` inspector. Otherwise the inspector says the live record is unavailable and keeps the fallback.
4. A record's `apk_url` must be `https://akalynth.com/download/akalynth-beta-vN.apk`, with `N` equal to the `-vN` suffix of `version_name` and no credentials, port, query, or fragment.
5. Provenance is all-or-nothing: `source_commit`, `ui_contract`, and `signing_certificate_sha256` are all present and well-formed, or all absent (shown as "Not recorded for this legacy release"). A partial set is rejected.
6. Integrity is the user's own `sha256sum -c` against the published checksum file. The site displays digests; it never claims to have checked the download.
7. `beta` in the filename is artifact compatibility, and `lane=prod` is the server's update-lane name. Neither is a release-stage claim, and neither belongs in rendered copy.

Field rules, the fallback bump checklist, and publish ordering are in
[references/apk-release-custody.md](references/apk-release-custody.md). Read it
before touching any `data-android-*` target, `ANDROID_RELEASE_FALLBACK`,
`DOWNLOAD_URL`, the release fields in `js/support.js`, or the canonical filename
in `scripts/check-static-site.sh`.

## Copy and claims

- Stage: the game is a pre-alpha vertical slice, and PRs and notes should say so. Rendered site copy names no stage at all. The check rejects visible `alpha`, `beta`, or `pre-alpha`, and stage words in client-visible JS strings, exempting only the canonical APK filename and the `/v1/beta/me` compatibility request.
- Never describe the game or the site as production, launched, content-alpha, or ready for live service.
- Android only: no `/play` links and no browser-play or F-Droid wording.
- Server authority: an action reads as accepted only after the server accepts it and a fresh server read follows. One in-flight mutation per target. No browser-local ownership, balance, or inventory.
- Community stays read-only. Support says `SUPPORT CHANNEL NOT CONNECTED`. The Patron Pack stays `DESIGN PROPOSAL`, `NOT YET AVAILABLE`, and `PRICE NOT SET`, with no checkout.
- Invite codes come only from an explicit paste, never the URL. Password-reset tokens are read from the URL fragment and scrubbed, never from the query.

## Pull requests

Contributions are maintainer-requested only (`CONTRIBUTING.md`). Fill in
`.github/PULL_REQUEST_TEMPLATE.md` and paste the verifier's final lines as
evidence. Before asking for review:

- `./scripts/verify-account-character-site.sh` passes and `git diff --check` is clean.
- No stage, launch, or production wording, and no new APK facts without a named release record.
- The handoff names a commit, not a deploy.
