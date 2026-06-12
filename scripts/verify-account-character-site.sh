#!/usr/bin/env bash
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

bash -n ./scripts/check-static-site.sh ./scripts/check-public-boundary.sh
node --check ./scripts/verify-site-e2d-gameplay.mjs

if ! grep -Fq 'scripts/verify-account-character-site.sh' .github/workflows/site-checks.yml; then
  printf '::error::site-checks workflow must run scripts/verify-account-character-site.sh.\n' >&2
  exit 1
fi

./scripts/check-static-site.sh
./scripts/check-public-boundary.sh
node ./scripts/verify-site-e2d-gameplay.mjs

printf 'Account-character site verification passed.\n'
