# AKALYNTH_WEBSITE_HERO_ICON_GAP_FILL_V1

Generated: 2026-06-22T20:35:00Z

## Lane

- Lane id: `AKALYNTH_WEBSITE_HERO_ICON_GAP_FILL_V1`
- Repository: `akalynth/akalynth-site`
- Base: `AKALYNTH_WEBSITE_FULL_VISUAL_BUILD_FROM_ASSETS_V1` (56 public derivatives)

## Problem

Visual pack copy V1 included only three `hero/` and three `icons/` files (lanes 01, 06,
10 plus witness-moth icon). Lanes 02–05 and 07–09 were missing hero covers and most icon
candidates needed for complete codex entry wiring.

## Method

Deterministic ffmpeg derivatives from existing public WebPs only:

- `hero/*`: banner `1600x700` → cover-crop `1920x1080`
- `icons/*`: card `800x1000` → center-square crop → `1024x1024`

Script: `scripts/build-visual-hero-icon-gaps.sh`

No new model generation, no drop imports, no source masters.

## Added Files

| Class | Count | Lanes |
| --- | ---: | --- |
| `hero` | 7 | 02–05, 07–09 |
| `icons` | 6 | 02–04, 07–09 (05 already present) |
| Total new | 13 | |

## Post-copy totals

| Class | Count |
| --- | ---: |
| `banners` | 10 |
| `cards` | 10 |
| `thumbs` | 10 |
| `wallpapers` | 10 |
| `og` | 10 |
| `hero` | 10 |
| `icons` | 9 |
| Total visuals | 69 |

## Validation

```bash
./scripts/build-visual-hero-icon-gaps.sh   # idempotent rebuild
./scripts/check-static-site.sh
./scripts/check-public-boundary.sh
```