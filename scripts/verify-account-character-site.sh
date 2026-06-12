#!/usr/bin/env bash
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

bash -n ./scripts/check-static-site.sh ./scripts/check-public-boundary.sh

./scripts/check-static-site.sh
./scripts/check-public-boundary.sh

printf 'Account-character site verification passed.\n'
