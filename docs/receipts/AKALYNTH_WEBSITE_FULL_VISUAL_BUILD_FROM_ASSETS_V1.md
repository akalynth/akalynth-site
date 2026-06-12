# AKALYNTH_WEBSITE_FULL_VISUAL_BUILD_FROM_ASSETS_V1

Generated: 2026-06-06T19:18:24Z

## Lane

- Lane id: `AKALYNTH_WEBSITE_FULL_VISUAL_BUILD_FROM_ASSETS_V1`
- Repository: `akalynth/akalynth-site`
- Branch: `codex/website-full-visual-build-from-assets-v1`
- Base branch: `main`
- Base SHA: `0752862f155da89d7730fdd24809484e2509dcd2`
- Pre-commit tree SHA before this receipt was added: `c445b503199df74590fbd648574737da80f38648`
- Head SHA note: the final commit SHA is recorded in the draft PR and final status after commit creation. A committed receipt cannot self-record the hash of the commit that contains it without changing that hash.

## PR #15 Review

- PR: `https://github.com/akalynth/akalynth-site/pull/15`
- Title: `[codex] launch High City marketing lane`
- State: `MERGED`
- Base/head: `main` <- `codex/high-city-marketing-lane`
- Merged at: `2026-06-06T03:50:53Z`
- Merge commit: `17346304ecea3c03bcc6a200427e95be9fc9bade`
- Review decision from `gh pr view`: empty string
- Result: partial overlap only. PR #15 added the High City marketing lane, but did not integrate the full visual pack, wallpaper archive, or new local OG image surface.

## Inputs

All four input manifests verified with `sha256sum -c MANIFEST.sha256`.

| Input directory | `MANIFEST.sha256` hash |
| --- | --- |
| `AKALYNTH_WEBSITE_VISUAL_ASSET_PACK_V1` | `32076b3244f74aa5a98a0465dea4ae06fa606411bc741199aebb78aeb8309855` |
| `AKALYNTH_WEBSITE_HOME_WORLD_LORE_ASSET_PATCH_V1` | `43d927d119e875a9c65a422f720e32eb18c9a21abfc13f85a24378bda566f477` |
| `AKALYNTH_WEBSITE_REPO_BRANCH_APPLY_V1` | `c4515ade59523e9a871cfbe8e7496ebd3e786eb5ce7c9d4bd38686af10bb4e25` |
| `AKALYNTH_WEBSITE_VISUAL_BRANCH_PR_V1` | `112435f6775a87ba7dd266ecc1c555562f98a3f6c7ac9c3b7b44b85c9cbfb652` |

## Public Asset Copy

Copied only public web derivatives into `assets/akalynth/visuals/`.

| Class | Count |
| --- | ---: |
| `banners` | 10 |
| `cards` | 10 |
| `thumbs` | 10 |
| `wallpapers` | 10 |
| `og` | 10 |
| `hero` | 3 |
| `icons` | 3 |
| Total | 56 |

Excluded from the public copy: ZIP files, source images, `.DS_Store`, receipts, prompts, raw originals, previews, snippets, registries, and implementation notes.

## Changed Surface

- Added `assets/akalynth/visuals/` with the 56 copied public derivatives.
- Added `wallpapers.html` titled `Akalynth Visual Archive — Wallpaper Series I`.
- Updated `index.html` with the High City Dawn visual hero, a 10-card visual region grid, bounded pre-alpha copy, a Wallpapers nav entry, and local social images.
- Updated `codex.html` and `library.html` with Chronicle/lore banner headers and public-safe visual archive references.
- Updated `beta.html`, `shop.html`, `houses.html`, `account.html`, and `forum.html` with local social-image metadata where useful.
- Updated shared navigation to include `Wallpapers`.
- Updated `css/style.css` for responsive hero imagery, image cards, lore banners, wallpaper grid, scrims, focus states, and mobile layout.
- Updated `scripts/check-static-site.sh` to include `wallpapers.html` and validate local `og:image` / `twitter:image` references.

## Validation

- `sha256sum -c MANIFEST.sha256` for all four input directories: passed.
- `scripts/check-static-site.sh`: passed.
- `git diff --check`: passed.
- `scripts/check-public-boundary.sh`: passed in the final staged validation run.
- `npm test`: not_present, no `package.json`.
- `npm run build`: not_present, no `package.json`.
- `npm run lint`: not_present, no `package.json`.
- `npm run health`: not_present, no `package.json`.

Local preview smoke checks used `127.0.0.1:8099` through `scripts/check-static-site.sh` and covered:

- `index.html`
- `wallpapers.html`
- `codex.html`
- `library.html`
- `beta.html`
- `shop.html`
- `houses.html`
- `account.html`
- `forum.html`

## Boundary

- No deploy performed.
- No merge performed.
- No Pages, DNS, or CDN change performed.
- No backend, runtime, payment, or entitlement work was performed in this visual-build lane.
- Current `js/app.js` is a static frontend integration surface: it calls the account, character, shop, work, and property HTTP APIs from the browser, while still adding no analytics, payment integration, deployment, or runtime mutation.
