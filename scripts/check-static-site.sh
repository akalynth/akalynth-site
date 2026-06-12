#!/usr/bin/env bash
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

required_pages=(index.html beta.html codex.html library.html wallpapers.html shop.html houses.html account.html forum.html codex/builder/index.html codex/operator/index.html codex/agent/index.html)

for page in "${required_pages[@]}"; do
  if [[ ! -f "$page" ]]; then
    printf '::error::Required page missing: %s\n' "$page" >&2
    exit 1
  fi
done

port="${AKALYNTH_SITE_TEST_PORT:-8099}"
log_file="$(mktemp)"

cleanup() {
  if [[ -n "${server_pid:-}" ]] && kill -0 "$server_pid" 2>/dev/null; then
    kill "$server_pid" 2>/dev/null || true
    wait "$server_pid" 2>/dev/null || true
  fi
  rm -f "$log_file"
}
trap cleanup EXIT

python3 -m http.server "$port" --bind 127.0.0.1 >"$log_file" 2>&1 &
server_pid="$!"

for _ in {1..30}; do
  if curl -fsS "http://127.0.0.1:${port}/index.html" >/dev/null 2>&1; then
    break
  fi
  sleep 0.2
done

if ! kill -0 "$server_pid" 2>/dev/null; then
  cat "$log_file" >&2
  printf '::error::Static server failed to start.\n' >&2
  exit 1
fi

for page in "${required_pages[@]}"; do
  curl -fsSI "http://127.0.0.1:${port}/${page}" >/dev/null
done

for route in codex/builder/ codex/operator/ codex/agent/; do
  curl -fsSI "http://127.0.0.1:${port}/${route}" >/dev/null
done

require_literal() {
  local file="$1"
  local literal="$2"
  local label="$3"
  if ! grep -Fq -- "$literal" "$file"; then
    printf '::error::%s missing in %s: %s\n' "$label" "$file" "$literal" >&2
    exit 1
  fi
}

for literal in \
  'api("/v1/accounts/me")' \
  'api("/v1/accounts/register", { method: "POST"' \
  'api("/v1/accounts/login", { method: "POST"' \
  'api("/v1/accounts/verify-email", { method: "POST"' \
  'api("/v1/characters").then' \
  'api("/v1/characters/select", { method: "POST"' \
  'api("/v1/characters", { method: "POST"' \
  'api("/v1/shop/purchase", { method: "POST"' \
  'api("/v1/work/start", { method: "POST"' \
  'api("/v1/work/tick", { method: "POST"' \
  '"/v1/property/buy"' \
  'api("/v1/property/list"' \
  '"/v1/property/unlist"'; do
  require_literal "js/app.js" "$literal" "Server-backed account/economy route"
done

require_literal "account.html" 'id="account-portal-root"' "Account character portal hook"

for route_page in codex/builder/index.html codex/operator/index.html codex/agent/index.html; do
  require_literal "$route_page" 'Create account character' "Codex surface account-character CTA"
  require_literal "$route_page" '/account.html' "Codex surface account portal link"
done

for literal in \
  'href="/account.html"' \
  'Create account character' \
  'href="/codex/builder/"' \
  'href="/codex/operator/"' \
  'href="/codex/agent/"'; do
  require_literal "codex.html" "$literal" "Public Codex four-surface account-character link"
done

for literal in \
  'name="world_id"' \
  'name="sex"' \
  'name="outfit_id"'; do
  require_literal "js/app.js" "$literal" "Account character portal field"
done

for literal in \
  'id="beta-account-status"' \
  '<script src="js/app.js" defer></script>'; do
  require_literal "beta.html" "$literal" "Beta account-character readiness hook"
done

require_literal "js/app.js" 'data-shop-buy="' "Direct server shop action hook"
require_literal "shop.html" 'id="purchase-authority"' "Direct server shop status hook"
require_literal "js/app.js" 'function clearAccountScopedUiState()' "Account-scoped UI clear helper"
require_literal "js/app.js" 'clearAccountScopedUiState();' "Account-scoped UI clear call"
require_literal "js/app.js" 'function clearLocalSessionUi(message, kind)' "Local session UI clear helper"
require_literal "js/app.js" 'Signed out locally. Server logout could not be confirmed:' "Failed logout local clear message"
require_literal "js/app.js" 'function csrfReady()' "CSRF readiness helper"
require_literal "js/app.js" 'function accountActionBlockedMessage()' "Account action guard helper"
require_literal "js/app.js" 'Security token missing. Sign in again before account character or gameplay actions.' "CSRF missing inline action message"
require_literal "js/app.js" 'var blocked = accountActionBlockedMessage();' "Account action guard call"

guard_call_count="$(grep -F 'var blocked = accountActionBlockedMessage();' js/app.js | wc -l | tr -d '[:space:]')"
if [[ "$guard_call_count" -lt 6 ]]; then
  printf '::error::Expected account action guard before each account-owned mutation; found %s guard calls.\n' "$guard_call_count" >&2
  exit 1
fi

if grep -RInE 'no .*account session integration|no .*service calls|localStorage-only|browser-preview script|does not create accounts|Real account creation' docs README.md PUBLIC_BOUNDARY.md *.html js >/dev/null; then
  printf '::error::Stale account/API boundary wording found; the static site now integrates account and character APIs.\n' >&2
  grep -RInE 'no .*account session integration|no .*service calls|localStorage-only|browser-preview script|does not create accounts|Real account creation' docs README.md PUBLIC_BOUNDARY.md *.html js >&2
  exit 1
fi

if grep -RInE '"network_calls_added": false|"account_session_integration_added": false|"service_calls_added": false' docs/receipts >/dev/null; then
  printf '::error::Stale receipt boundary flags found; the static site now calls account, character, shop, work, and property APIs.\n' >&2
  grep -RInE '"network_calls_added": false|"account_session_integration_added": false|"service_calls_added": false' docs/receipts >&2
  exit 1
fi

python3 - "$repo_root" "${required_pages[@]}" <<'PY'
import re
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlparse

root = Path(sys.argv[1]).resolve()
pages = [Path(p) for p in sys.argv[2:]]
errors = []


class LinkParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.refs = []

    def handle_starttag(self, tag, attrs):
        attr_map = dict(attrs)
        for name, value in attrs:
            if name in {"href", "src"} and value:
                self.refs.append(value)
        if tag == "meta":
            content = attr_map.get("content")
            property_name = attr_map.get("property")
            name = attr_map.get("name")
            if content and (property_name in {"og:image", "og:image:secure_url"} or name == "twitter:image"):
                self.refs.append(content)


def should_skip(ref):
    parsed = urlparse(ref)
    if parsed.scheme in {"http", "https", "mailto", "tel", "data", "javascript"}:
        return True
    if parsed.netloc:
        return True
    return ref.startswith("#")


def check_ref(ref, base, source):
    if should_skip(ref):
        return
    parsed = urlparse(ref)
    path = unquote(parsed.path)
    if not path:
        return
    target = (base / path.lstrip("/")).resolve()
    try:
        target.relative_to(root)
    except ValueError:
        errors.append(f"{source}: path escapes site root: {ref}")
        return
    if not target.exists():
        errors.append(f"{source}: missing local target: {ref}")


for page in pages:
    source = root / page
    parser = LinkParser()
    parser.feed(source.read_text(encoding="utf-8"))
    for ref in parser.refs:
        check_ref(ref, root, str(page))

for css in sorted((root / "css").glob("*.css")):
    text = css.read_text(encoding="utf-8")
    for match in re.finditer(r"url\\(([^)]+)\\)", text):
        ref = match.group(1).strip().strip("'\"")
        check_ref(ref, css.parent, str(css.relative_to(root)))

if errors:
    for err in errors:
        print(f"::error::{err}", file=sys.stderr)
    sys.exit(1)

print("Local static link check passed.")
PY

printf 'Static site smoke test passed.\n'
