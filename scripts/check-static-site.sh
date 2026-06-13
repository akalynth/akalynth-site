#!/usr/bin/env bash
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

required_pages=(index.html beta.html library.html wallpapers.html shop.html houses.html account.html forum.html)

for page in "${required_pages[@]}"; do
  if [[ ! -f "$page" ]]; then
    printf '::error::Required page missing: %s\n' "$page" >&2
    exit 1
  fi
done

# Codex is operator-only: it must NOT be present on the public site, and no page
# may link to it. Source of truth lives outside this repo (akalynth-ops/codex).
forbidden_paths=(codex.html codex css/codex.css js/codex-data.js js/codex-os.js)
for path in "${forbidden_paths[@]}"; do
  if [[ -e "$path" ]]; then
    printf '::error::Public Codex surface must be removed: %s\n' "$path" >&2
    exit 1
  fi
done
if grep -RIl --include='*.html' -e 'href="codex.html"' -e 'href="/codex/' . >/dev/null 2>&1; then
  printf '::error::Public page links to the removed Codex surface (codex.html or /codex/).\n' >&2
  grep -RIn --include='*.html' -e 'href="codex.html"' -e 'href="/codex/' . >&2
  exit 1
fi

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
  'api("/v1/worlds").then' \
  'api("/v1/outfits").then' \
  'api("/v1/characters").then' \
  'api("/v1/characters/select", { method: "POST"' \
  'api("/v1/characters", { method: "POST"' \
  'api("/v1/wallet?character_id="' \
  'api("/v1/shop/purchase", { method: "POST"' \
  'api("/v1/work/start", { method: "POST"' \
  'api("/v1/work/tick", { method: "POST"' \
  '"/v1/property/buy"' \
  'api("/v1/property/list"' \
  '"/v1/property/unlist"'; do
  require_literal "js/app.js" "$literal" "Server-backed account/economy route"
done

require_literal "account.html" 'id="account-portal-root"' "Account character portal hook"
require_literal "README.md" 'executable site E2D' "Site E2D proof documentation"
require_literal "README.md" 'create/select/shop/work/property requests' "Site E2D character and gameplay proof documentation"
require_literal "README.md" 'explicit no-session/no-CSRF inline' "Site E2D no-session/no-CSRF helper proof documentation"

for literal in \
  'function validWorld(entry)' \
  'function validOutfit(entry)' \
  'function validCharacter(entry)' \
  'state.characters = (chars.characters || []).filter(validCharacter);' \
  'worldName(c.world_id)' \
  'c.sex || "-"' \
  'outfitName(c.outfit_id)' \
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
require_literal "js/app.js" 'state.goldBalance = typeof body.balance_gold === "number" ? body.balance_gold : null;' "Server-backed wallet balance load"
require_literal "js/app.js" 'setText("#holdings-gold", state.goldBalance == null ? "server" : fmt(state.goldBalance));' "Server-backed wallet balance render"
require_literal "js/app.js" 'if (typeof body.balance_gold === "number") state.goldBalance = body.balance_gold;' "Server-backed mutation balance refresh"
require_literal "js/app.js" 'body: { character_id: character.character_id, shop_key: itemId }' "Shop purchase uses captured account-owned character"
require_literal "js/app.js" 'body: { character_id: character.character_id }' "Work start uses captured account-owned character"
require_literal "js/app.js" 'body: { character_id: character.character_id, contract_id: state.workContract.contract_id }' "Work tick uses captured account-owned character"
require_literal "js/app.js" 'body: { character_id: character.character_id, property_id: id }' "Property buy/unlist uses captured account-owned character"
require_literal "js/app.js" 'body: { character_id: character.character_id, property_id: id, price_gold: price }' "Property list uses captured account-owned character"
require_literal "js/app.js" 'window.__AKALYNTH_SITE_E2D_TEST_HOOKS__.install({' "Site E2D gameplay test hooks"
require_literal "js/app.js" 'selectAccountCharacter: selectAccountCharacter' "Site E2D character select test hook"
require_literal "js/app.js" 'createAccountCharacter: createAccountCharacter' "Site E2D character create test hook"
require_literal "scripts/verify-site-e2d-character-gameplay.mjs" "site e2d character/gameplay verifier passed" "Site E2D character/gameplay verifier success output"
require_literal "scripts/verify-site-e2d-character-gameplay.mjs" "site e2d character/gameplay verifier failed" "Site E2D character/gameplay verifier failure output"
require_literal "scripts/verify-site-e2d-character-gameplay.mjs" "assertRequest('/v1/characters', { name: 'CreatedSiteProof', world_id: 'high_city', sex: 'female', outfit_id: 'female_guard' });" "Site E2D character create request proof"
require_literal "scripts/verify-site-e2d-character-gameplay.mjs" "assertRequest('/v1/characters/select', { character_id: 'char-site-e2d' });" "Site E2D character select request proof"
require_literal "scripts/verify-site-e2d-character-gameplay.mjs" "assertRequest('/v1/work/start', { character_id: 'char-site-e2d' });" "Site E2D work start request proof"
require_literal "scripts/verify-site-e2d-character-gameplay.mjs" "assertRequest('/v1/work/tick', { character_id: 'char-site-e2d', contract_id: 'contract-site-e2d' });" "Site E2D work tick request proof"
require_literal "scripts/verify-site-e2d-character-gameplay.mjs" "assertRequest('/v1/shop/purchase', { character_id: 'char-site-e2d', shop_key: 'healing_herb' });" "Site E2D shop request proof"
require_literal "scripts/verify-site-e2d-character-gameplay.mjs" "assertRequest('/v1/property/buy', { character_id: 'char-site-e2d', property_id: 'Azura:H1' });" "Site E2D property buy request proof"
require_literal "scripts/verify-site-e2d-character-gameplay.mjs" "assertRequest('/v1/property/unlist', { character_id: 'char-site-e2d', property_id: 'Azura:H1' });" "Site E2D property unlist request proof"
require_literal "scripts/verify-site-e2d-character-gameplay.mjs" "assertRequest('/v1/property/list', { character_id: 'char-site-e2d', property_id: 'Azura:H1', price_gold: 77 });" "Site E2D property list request proof"
require_literal "scripts/verify-site-e2d-character-gameplay.mjs" "async function assertNoNewRequests(label, action)" "Site E2D no-request guard helper"
require_literal "scripts/verify-site-e2d-character-gameplay.mjs" "assertNoNewRequests('create character without account session'" "Site E2D create without session proof"
require_literal "scripts/verify-site-e2d-character-gameplay.mjs" "assertNoNewRequests('select character without account session'" "Site E2D select without session proof"
require_literal "scripts/verify-site-e2d-character-gameplay.mjs" "assertNoNewRequests('start work without account session'" "Site E2D work without session proof"
require_literal "scripts/verify-site-e2d-character-gameplay.mjs" "assertNoNewRequests('shop purchase without account session'" "Site E2D shop without session proof"
require_literal "scripts/verify-site-e2d-character-gameplay.mjs" "assertNoNewRequests('property buy without account session'" "Site E2D property buy without session proof"
require_literal "scripts/verify-site-e2d-character-gameplay.mjs" "assertNoNewRequests('property list without account session'" "Site E2D property list without session proof"
require_literal "scripts/verify-site-e2d-character-gameplay.mjs" "assertNoNewRequests('create character without csrf'" "Site E2D create without CSRF proof"
require_literal "scripts/verify-site-e2d-character-gameplay.mjs" "assertNoNewRequests('select character without csrf'" "Site E2D select without CSRF proof"
require_literal "scripts/verify-site-e2d-character-gameplay.mjs" "assertNoNewRequests('start work without csrf'" "Site E2D work without CSRF proof"
require_literal "scripts/verify-site-e2d-character-gameplay.mjs" "assertNoNewRequests('shop purchase without csrf'" "Site E2D shop without CSRF proof"
require_literal "scripts/verify-site-e2d-character-gameplay.mjs" "assertNoNewRequests('property buy without csrf'" "Site E2D property buy without CSRF proof"
require_literal "scripts/verify-site-e2d-character-gameplay.mjs" "assertNoNewRequests('property list without csrf'" "Site E2D property list without CSRF proof"
require_literal "js/app.js" 'Purchase accepted by server.' "Server-backed purchase success message"
require_literal "js/app.js" 'Work complete: +' "Server-backed work completion message"
require_literal "js/app.js" 'rememberHouseOverride(body.property);' "Server-backed property mutation mirror"
require_literal "js/app.js" 'Listed by server.' "Server-backed property list success message"
require_literal "js/app.js" 'Unlisted by server.' "Server-backed property unlist success message"
require_literal "js/app.js" 'function clearAccountScopedUiState()' "Account-scoped UI clear helper"
require_literal "js/app.js" 'clearAccountScopedUiState();' "Account-scoped UI clear call"
require_literal "js/app.js" 'function clearLocalSessionUi(message, kind)' "Local session UI clear helper"
require_literal "js/app.js" 'Signed out locally. Server logout could not be confirmed:' "Failed logout local clear message"
require_literal "js/app.js" 'function csrfReady()' "CSRF readiness helper"
require_literal "js/app.js" 'function accountActionBlockedMessage()' "Account action guard helper"
require_literal "js/app.js" 'function accountCharacterActionBlockedMessage()' "Account character action guard helper"
require_literal "js/app.js" 'credentials: "include"' "Account API cookie/session transport"
require_literal "js/app.js" 'headers["x-csrf-token"] = csrf;' "Account API CSRF header transport"
require_literal "js/app.js" 'Security token missing. Sign in again before account character or gameplay actions.' "CSRF missing inline action message"
require_literal "js/app.js" 'Sign in with an account session before creating or selecting a character.' "Account-character session required message"
require_literal "js/app.js" 'Security token missing. Sign in again before creating or selecting a character.' "Account-character CSRF required message"
require_literal "js/app.js" 'This character is not available on the signed-in account. Sign in again or select an account-owned character.' "Account-owned character error message"
require_literal "js/app.js" 'Only the account-owned character that owns this property can change it.' "Property owner error message"
require_literal "js/app.js" 'That shop item is not available.' "Unknown shop item error message"
require_literal "js/app.js" 'Enter a positive gold price.' "Invalid property price error message"
require_literal "js/app.js" 'That property plot was not found.' "Unknown property plot error message"
require_literal "js/app.js" 'This property is already listed. Unlist it before listing again.' "Property already-listed error message"
require_literal "js/app.js" 'This property is not currently listed.' "Property not-listed error message"
require_literal "js/app.js" 'This property is not currently for sale.' "Property not-for-sale error message"
require_literal "js/app.js" 'You already own this property.' "Own property buy error message"
require_literal "js/app.js" 'Finish the current work contract before starting another.' "Work already-active error message"
require_literal "js/app.js" 'Work is cooling down. Try again later.' "Work cooldown error message"
require_literal "js/app.js" 'Start work again. This contract is no longer active.' "Invalid work contract error message"
require_literal "js/app.js" 'Stay present in the world before ticking work again.' "Work presence error message"
require_literal "js/app.js" 'Not enough earned gold for this action.' "Insufficient gold error message"
require_literal "js/app.js" 'var blocked = accountActionBlockedMessage();' "Account action guard call"

guard_call_count="$(grep -F 'var blocked = accountActionBlockedMessage();' js/app.js | wc -l | tr -d '[:space:]')"
if [[ "$guard_call_count" -lt 5 ]]; then
  printf '::error::Expected account action guard before each gameplay mutation; found %s guard calls.\n' "$guard_call_count" >&2
  exit 1
fi

character_guard_call_count="$(grep -F 'var blocked = accountCharacterActionBlockedMessage();' js/app.js | wc -l | tr -d '[:space:]')"
if [[ "$character_guard_call_count" -lt 2 ]]; then
  printf '::error::Expected account-character guard before create/select mutations; found %s guard calls.\n' "$character_guard_call_count" >&2
  exit 1
fi

python3 - "$repo_root/js/app.js" <<'PY'
import sys
from pathlib import Path

path = Path(sys.argv[1])
lines = path.read_text(encoding="utf-8").splitlines()

checks = [
    ("character select", 'api("/v1/characters/select", { method: "POST"', 10, "accountCharacterActionBlockedMessage"),
    ("character create", 'api("/v1/characters", { method: "POST"', 10, "accountCharacterActionBlockedMessage"),
    ("shop purchase", 'api("/v1/shop/purchase", { method: "POST"', 12, "accountActionBlockedMessage"),
    ("work start", 'api("/v1/work/start", { method: "POST"', 12, "accountActionBlockedMessage"),
    ("work tick", 'api("/v1/work/tick", { method: "POST"', 16, "accountActionBlockedMessage"),
    ("property buy/unlist", 'api(buy ? "/v1/property/buy" : "/v1/property/unlist"', 12, "accountActionBlockedMessage"),
    ("property list", 'api("/v1/property/list"', 14, "accountActionBlockedMessage"),
]

errors = []
for label, marker, window, guard in checks:
    matches = [idx for idx, line in enumerate(lines) if marker in line]
    if not matches:
        errors.append(f"{label}: missing route marker {marker}")
        continue
    for idx in matches:
        start = max(0, idx - window)
        context = "\n".join(lines[start:idx])
        if guard not in context:
            errors.append(f"{label}: missing nearby {guard} guard before line {idx + 1}")

selected_character_checks = [
    ("wallet read", 'api("/v1/wallet?character_id="', 10),
    ("shop purchase", 'api("/v1/shop/purchase", { method: "POST"', 12),
    ("work start", 'api("/v1/work/start", { method: "POST"', 12),
    ("work tick", 'api("/v1/work/tick", { method: "POST"', 16),
    ("property buy/unlist", 'api(buy ? "/v1/property/buy" : "/v1/property/unlist"', 12),
    ("property list", 'api("/v1/property/list"', 14),
]

for label, marker, window in selected_character_checks:
    for idx, line in enumerate(lines):
        if marker not in line:
            continue
        start = max(0, idx - window)
        context = "\n".join(lines[start:idx])
        if "selectedCharacter" not in context and "character" not in context:
            errors.append(f"{label}: missing nearby selected-character guard before line {idx + 1}")
        if label == "wallet read" and "state.account" not in context:
            errors.append(f"{label}: missing nearby account guard before line {idx + 1}")

if errors:
    for error in errors:
        print(f"::error::{error}", file=sys.stderr)
    sys.exit(1)
PY

if grep -RInE 'no .*account session integration|no .*service calls|localStorage-only|browser-preview script|does not create accounts|Real account creation' docs README.md SECURITY.md PUBLIC_BOUNDARY.md *.html js >/dev/null; then
  printf '::error::Stale account/API boundary wording found; the static site now integrates account and character APIs.\n' >&2
  grep -RInE 'no .*account session integration|no .*service calls|localStorage-only|browser-preview script|does not create accounts|Real account creation' docs README.md SECURITY.md PUBLIC_BOUNDARY.md *.html js >&2
  exit 1
fi

if grep -RInE '"network_calls_added": false|"account_session_integration_added": false|"service_calls_added": false' docs/receipts >/dev/null; then
  printf '::error::Stale receipt boundary flags found; the static site now calls account, character, shop, work, and property APIs.\n' >&2
  grep -RInE '"network_calls_added": false|"account_session_integration_added": false|"service_calls_added": false' docs/receipts >&2
  exit 1
fi

for manifest in docs/receipts/*.MANIFEST.sha256; do
  [[ -f "$manifest" ]] || continue
  sha256sum -c "$manifest" >/dev/null
done

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
