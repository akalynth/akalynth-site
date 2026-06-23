#!/usr/bin/env bash
# Build missing public hero/icon derivatives from existing banner/card WebPs.
# Lane 05 already has an icon; lanes 01, 06, and 10 already have hero+icon.
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

visuals_root="assets/akalynth/visuals"
need_ffmpeg() {
  if ! command -v ffmpeg >/dev/null 2>&1; then
    printf '::error::ffmpeg is required to build hero/icon gaps\n' >&2
    exit 1
  fi
}

build_hero() {
  local slug="$1"
  local banner="${visuals_root}/banners/${slug}.banner-1600x700.webp"
  local hero="${visuals_root}/hero/${slug}.hero-cover-1920x1080.webp"
  if [[ ! -f "$banner" ]]; then
    printf '::error::missing banner for hero: %s\n' "$banner" >&2
    exit 1
  fi
  ffmpeg -y -hide_banner -loglevel error -i "$banner" \
    -vf "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080" \
    "$hero"
  printf 'built hero: %s\n' "$hero"
}

build_icon() {
  local slug="$1"
  local card="${visuals_root}/cards/${slug}.card-800x1000.webp"
  local icon="${visuals_root}/icons/${slug}.icon-candidate-1024.webp"
  if [[ ! -f "$card" ]]; then
    printf '::error::missing card for icon: %s\n' "$card" >&2
    exit 1
  fi
  ffmpeg -y -hide_banner -loglevel error -i "$card" \
    -vf "crop=min(iw\,ih):min(iw\,ih),scale=1024:1024" \
    "$icon"
  printf 'built icon: %s\n' "$icon"
}

need_ffmpeg

hero_slugs=(
  "02-rookguard-gate"
  "03-forgehold"
  "04-liminal-web"
  "05-witness-moth"
  "07-memory-fracture"
  "08-silent-century"
  "09-cinderwatch-frontier"
)

icon_slugs=(
  "02-rookguard-gate"
  "03-forgehold"
  "04-liminal-web"
  "07-memory-fracture"
  "08-silent-century"
  "09-cinderwatch-frontier"
)

for slug in "${hero_slugs[@]}"; do
  build_hero "$slug"
done

for slug in "${icon_slugs[@]}"; do
  build_icon "$slug"
done

printf 'hero/icon gap build complete: %d heroes, %d icons\n' \
  "${#hero_slugs[@]}" "${#icon_slugs[@]}"