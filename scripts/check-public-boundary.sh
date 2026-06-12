#!/usr/bin/env bash
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

failures=0

fail() {
  printf '::error::%s\n' "$1" >&2
  failures=1
}

check_required_file() {
  local path="$1"
  if [[ ! -f "$path" ]]; then
    fail "Required file missing: $path"
  fi
}

grep_fixed_forbidden() {
  local label="$1"
  local pattern="$2"
  local output

  if output="$(git grep -n -I -F -- "$pattern" -- . \
    ':!scripts/check-public-boundary.sh' \
    ':!.github/workflows/site-checks.yml' || true)" && [[ -n "$output" ]]; then
    printf '%s\n' "$output" >&2
    fail "$label found: $pattern"
  fi
}

grep_regex_forbidden() {
  local label="$1"
  local pattern="$2"
  local output

  if output="$(git grep -n -I -E -- "$pattern" -- . || true)" && [[ -n "$output" ]]; then
    printf '%s\n' "$output" >&2
    fail "$label found"
  fi
}

check_required_file "index.html"
check_required_file "shop.html"
check_required_file "houses.html"
check_required_file "account.html"
check_required_file "PUBLIC_BOUNDARY.md"
check_required_file "PRE_ALPHA_NOTICE.md"
check_required_file "LICENSE"
check_required_file "SECURITY.md"
check_required_file "CONTRIBUTING.md"

slash="/"
api_word="api"
host_word="akalynth"
beta_word="beta"
staging_word="staging"
cad_word="Cad"
dy_word="dy"
system_word="system"
d_word="d"

for pattern in \
  "${slash}opt${slash}" \
  "${slash}var${slash}lib${slash}" \
  "${slash}etc${slash}" \
  "apps${slash}server" \
  "packages${slash}shared" \
  "chronicle"".""key" \
  "${api_word}.${host_word}" \
  "${beta_word}-${api_word}" \
  "${staging_word}-${api_word}" \
  "wss:" \
  "${cad_word}${dy_word}" \
  "${system_word}${d_word}"; do
  grep_fixed_forbidden "Forbidden private/server/runtime reference" "$pattern"
done

grep_regex_forbidden \
  "Secret, token, or private key pattern" \
  '-----BEGIN ([A-Z0-9 ]+ )?PRIVATE KEY-----|github_pat_[A-Za-z0-9_]+|gh[pousr]_[A-Za-z0-9_]{20,}|AKIA[0-9A-Z]{16}|sk-[A-Za-z0-9]{20,}|xox[baprs]-[A-Za-z0-9-]+'

for pattern in \
  "Real purchases ""open" \
  "payment processed ""successfully" \
  "payment will be ""processed" \
  "real account ""created" \
  "verified ""ownership" \
  "real house ""ownership" \
  "live auction ""is" \
  "Browser cart" \
  "Checkout disabled" \
  "Clear cart" \
  "production launch ""readiness" \
  "community contributions ""welcome" \
  "contributions ""welcome" \
  "open ""source"; do
  grep_fixed_forbidden "Forbidden public claim wording" "$pattern"
done

require_literal() {
  local path="$1"
  local literal="$2"
  local label="$3"

  if ! grep -Fq -- "$literal" "$path"; then
    fail "$label missing in $path: $literal"
  fi
}

require_literal \
  "PRE_ALPHA_NOTICE.md" \
  "This repository is a static public website and account-portal frontend." \
  "Static site/account portal boundary"
require_literal \
  "PRE_ALPHA_NOTICE.md" \
  "The account portal calls the Akalynth API when available." \
  "Account API integration boundary"
require_literal \
  "PUBLIC_BOUNDARY.md" \
  "This repository may call public Akalynth API endpoints, including account and" \
  "Public API call boundary"
require_literal \
  "PUBLIC_BOUNDARY.md" \
  "shop, wallet, work, and housing actions are live only when the server accepts" \
  "Server authority boundary"
require_literal \
  "SECURITY.md" \
  "Static account, character, shop, work," \
  "Security API surface boundary"
require_literal \
  "README.md" \
  "The account, shop, wallet, work, and housing pages are static frontends that call" \
  "README API frontend boundary"

generated_matches="$(git ls-files | grep -E '(^|/)(node_modules|dist|build|artifacts)/|(^|/)\.env($|[.])|\.log$|\.sqlite3?$|\.db$' || true)"
if [[ -n "$generated_matches" ]]; then
  printf '%s\n' "$generated_matches" >&2
  fail "Generated, runtime, environment, or database artifact committed"
fi

if (( failures != 0 )); then
  exit 1
fi

printf 'Public boundary checks passed.\n'
