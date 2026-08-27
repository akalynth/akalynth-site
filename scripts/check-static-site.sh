#!/usr/bin/env bash
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

required_pages=(
  index.html
  download.html
  houses.html
  market.html
  shop.html
  account.html
  register.html
  forgot.html
  library.html
  wallpapers.html
  community.html
  support.html
  beta.html
  forum.html
)

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

forbid_literal() {
  local file="$1"
  local literal="$2"
  local label="$3"
  if grep -Fq -- "$literal" "$file"; then
    printf '::error::%s present in %s: %s\n' "$label" "$file" "$literal" >&2
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
  'api("/v1/shop/catalog")' \
  'api("/v1/shop/purchase", { method: "POST"' \
  'api("/v1/work/start", { method: "POST"' \
  'api("/v1/work/tick", { method: "POST"' \
  'api("/v1/property/market")' \
  'api("/v1/property/ledger?property_id="' \
  '"/v1/property/buy"' \
  'api("/v1/property/list"' \
  '"/v1/property/unlist"'; do
  require_literal "js/app.js" "$literal" "Server-backed account/economy route"
done

require_literal "account.html" 'id="account-portal-root"' "Account character portal hook"
require_literal "download.html" 'href="/download/akalynth-beta-v12.apk"' "Immutable direct Android v12 download"
require_literal "download.html" 'href="/download/akalynth-beta-v12.apk.sha256"' "Immutable direct Android v12 checksum"
require_literal "download.html" 'data-android-release-inspector' "Public Android release inspector"
require_literal "download.html" 'data-android-source' "Android source provenance field"
require_literal "download.html" 'data-android-signer' "Android signing-certificate field"
require_literal "support.html" 'href="/download/akalynth-beta-v12.apk.sha256"' "Support checksum guidance"
require_literal "beta.html" '<meta http-equiv="refresh" content="0; url=download.html" />' "Legacy download compatibility redirect"
require_literal "beta.html" '<link rel="canonical" href="https://akalynth.com/download.html" />' "Legacy download canonical target"
require_literal "forum.html" 'location.replace("community.html" + location.search + location.hash);' "Legacy forum compatibility redirect"
require_literal "forum.html" '<link rel="canonical" href="https://akalynth.com/community.html" />' "Legacy forum canonical target"
if grep -RIFq 'https://beta.akalynth.com/download/akalynth-beta.apk' -- *.html js; then
  printf '::error::Direct Android download must not use the mutable generic APK alias.\n' >&2
  exit 1
fi
require_literal "register.html" 'window.location.replace("account.html?view=register");' "Paste-only registration route"
require_literal "forgot.html" 'window.history.replaceState(null, "", "forgot.html");' "Password-reset source URL scrubbing"
require_literal "forgot.html" 'window.location.replace("account.html?view=forgot");' "Password-reset request fallback"
forbid_literal "forgot.html" 'params.get("reset")' "Query password-reset token consumption"
forbid_literal "js/app.js" 'params.get("reset")' "Account query password-reset token consumption"
require_literal "account.html" '<meta name="referrer" content="no-referrer" />' "Account token referrer suppression"
require_literal "README.md" 'executable site E2D' "Site E2D proof documentation"
require_literal "README.md" 'create/select/shop/work/property' "Site E2D character and gameplay proof documentation"
require_literal "README.md" 'explicit no-session/no-CSRF inline' "Site E2D no-session/no-CSRF helper proof documentation"
require_literal "README.md" '`register.html` paste-only invite entry path' "Paste-only registration documentation"
require_literal "README.md" '`forgot.html` password-reset entry and confirmation path' "Password-reset documentation"

for literal in \
  'name="invite_code"' \
  'registrationPayload(formData(register))' \
  'if (invite) payload.invite_code = invite;' \
  'api("/v1/beta/me")' \
  'var betaStatusRequestGeneration = 0;' \
  'requestGeneration !== betaStatusRequestGeneration' \
  'state.account.account_id !== accountId' \
  'void refreshControlledBetaStatus();' \
  'history.replaceState(null, "", "account.html");'; do
  require_literal "js/app.js" "$literal" "Account compatibility behavior"
done

if grep -Fq 'get("invite")' js/app.js register.html ||
   grep -Fq "get('invite')" js/app.js register.html ||
   grep -Fq 'location.search' register.html; then
  printf '::error::Registration must accept invite codes by explicit paste only; URL invite prefill is forbidden.\n' >&2
  exit 1
fi

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

require_literal "js/app.js" 'data-shop-review="' "Server shop purchase review hook"
require_literal "shop.html" 'id="purchase-authority"' "Direct server shop status hook"
require_literal "shop.html" 'id="shop-confirm-dialog"' "Server shop purchase review dialog"
require_literal "shop.html" 'id="shop-confirm-balance"' "Shop available-gold review field"
require_literal "shop.html" 'id="shop-confirm-result"' "Shop resulting-balance review field"
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
require_literal "scripts/verify-site-e2d-character-gameplay.mjs" "site e2d Android companion authority verifier passed" "Site E2D Android companion verifier success output"
require_literal "scripts/verify-site-e2d-character-gameplay.mjs" "site e2d character/gameplay verifier failed" "Site E2D character/gameplay verifier failure output"
require_literal "scripts/verify-site-e2d-character-gameplay.mjs" "assertRequest('/v1/characters', { name: 'CreatedSiteProof', world_id: 'high_city', sex: 'female', outfit_id: 'female_guard' });" "Site E2D character create request proof"
require_literal "scripts/verify-site-e2d-character-gameplay.mjs" "assertRequest('/v1/characters/select', { character_id: 'char-site-e2d' });" "Site E2D character select request proof"
require_literal "scripts/verify-site-e2d-character-gameplay.mjs" "assertRequest('/v1/work/start', { character_id: 'char-site-e2d' });" "Site E2D work start request proof"
require_literal "scripts/verify-site-e2d-character-gameplay.mjs" "assertRequest('/v1/work/tick', { character_id: 'char-site-e2d', contract_id: 'contract-site-e2d' });" "Site E2D work tick request proof"
require_literal "scripts/verify-site-e2d-character-gameplay.mjs" "assertRequest('/v1/shop/purchase', { character_id: 'char-site-e2d', shop_key: 'pilgrim_mark' });" "Site E2D shop request proof"
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
require_literal "scripts/verify-site-e2d-character-gameplay.mjs" "empty invite must be omitted from registration payload" "Site E2D empty-invite omission proof"
require_literal "scripts/verify-site-e2d-character-gameplay.mjs" "pasted invite must be trimmed and included exactly once" "Site E2D pasted-invite proof"
require_literal "scripts/verify-site-e2d-character-gameplay.mjs" "reset fragment token must bind and scrub from the account URL" "Site E2D reset-token proof"
require_literal "scripts/verify-site-e2d-character-gameplay.mjs" "controlled beta status must retain the authorized cohort projection" "Site E2D controlled-beta status proof"
require_literal "scripts/verify-site-e2d-character-gameplay.mjs" "beta status transport failure must clear the optional projection" "Site E2D nonblocking beta status proof"
require_literal "scripts/verify-site-e2d-character-gameplay.mjs" "stale controlled beta response must not overwrite the current account projection" "Site E2D cross-account beta status isolation proof"
require_literal "scripts/verify-site-e2d-character-gameplay.mjs" "shop UI state must come from the server catalog without a local product fallback" "Site E2D server-catalog authority proof"
require_literal "scripts/verify-site-e2d-character-gameplay.mjs" "house registry must use public market/ledger data and mask raw-looking owner identifiers" "Site E2D server-market authority proof"
require_literal "scripts/verify-site-e2d-character-gameplay.mjs" "raw-looking public owner identifiers must not be rendered" "Site E2D public owner masking proof"
require_literal "scripts/verify-site-e2d-character-gameplay.mjs" "malformed shop catalog items must fail closed instead of reaching the renderer" "Site E2D malformed-catalog proof"
require_literal "scripts/verify-site-e2d-character-gameplay.mjs" "malformed market payloads must fail closed instead of becoming a successful empty registry" "Site E2D malformed-market proof"
require_literal "scripts/verify-site-e2d-character-gameplay.mjs" "an accepted property purchase must remain discoverable from its source-backed ledger and expose listing review" "Site E2D owned-property discovery proof"
require_literal "scripts/verify-site-e2d-character-gameplay.mjs" "purchase review must show an honest balance or shortfall" "Site E2D purchase-balance proof"
require_literal "js/app.js" 'Purchase accepted by the server; balance refreshed.' "Server-backed purchase success message"
require_literal "js/app.js" 'Work complete: +' "Server-backed work completion message"
require_literal "js/app.js" 'Purchase accepted; balance and registry refreshed.' "Server-backed property purchase refresh message"
require_literal "js/app.js" 'Listing accepted; registry refreshed.' "Server-backed property listing refresh message"
require_literal "js/app.js" 'Listing removed; registry refreshed.' "Server-backed property unlist refresh message"
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

# Consequential companion actions must fail closed in the browser: one mutation
# at a time per target, and accepted mutations are followed by fresh server
# reads before the UI claims a new balance, listing, or ownership state.
for literal in \
  'pendingMutations: {}' \
  'function beginMutation(kind, id)' \
  'function endMutation(kind, id)' \
  'if (!beginMutation("shop", itemId))' \
  'endMutation("shop", itemId);' \
  'if (!beginMutation(kind, id))' \
  'endMutation(kind, id);' \
  'if (!beginMutation("property-list", id))' \
  'endMutation("property-list", id);' \
  'return loadWalletState();' \
  'return Promise.all([loadWalletState(), loadHouseCards()])' \
  'return loadHouseCards()'; do
  require_literal "js/app.js" "$literal" "Server refresh / duplicate-submit guard"
done
forbid_literal "js/app.js" 'confirmedProperties' "Browser-local property authority mirror"
forbid_literal "js/app.js" 'rememberHouseOverride' "Browser-local property authority helper"
require_literal "js/app.js" 'function houseIsMine(h)' "Source-backed selected-character property ownership helper"
require_literal "js/app.js" 'h.owner_name === character.name' "Globally unique public owner-name inference"
require_literal "js/app.js" 'var KNOWN_PROPERTY_FIXTURES = [' "Source-backed owned-property discovery fixtures"
require_literal "js/app.js" 'return "Insufficient by " + fmt(price - balance) + " gold";' "Honest insufficient-balance projection"
forbid_literal "js/app.js" 'Math.max(0, state.goldBalance -' "Fabricated zero balance projection"

for literal in \
  'id="market-status"' \
  'id="houses-grid"' \
  'id="market-confirm-dialog"' \
  'id="market-confirm-character"' \
  'id="market-confirm-property"' \
  'id="market-confirm-balance"' \
  'id="market-confirm-result"'; do
  require_literal "market.html" "$literal" "House Registry state / review hook"
done
require_literal "market.html" 'Fixed-price only.' "House Registry auction boundary"
require_literal "js/app.js" 'document.getElementById("house-error-" + id)' "Property IDs remain literal DOM identifiers"
require_literal "js/app.js" 'var price = input ? Number(input.value) : NaN;' "Listing price parses the complete numeric value"
forbid_literal "js/app.js" '$("#house-error-" + id)' "Property ID CSS-selector interpolation"
forbid_literal "js/app.js" 'var price = input ? parseInt(input.value, 10) : NaN;' "Truncating listing-price parser"

require_literal "shop.html" 'High City Patron Pack' "Patron proposal title"
require_literal "shop.html" 'DESIGN PROPOSAL' "Patron proposal classification"
require_literal "shop.html" 'NOT YET AVAILABLE' "Patron non-live state"
require_literal "shop.html" 'PRICE NOT SET' "Patron unknown-price state"
forbid_literal "shop.html" 'data-checkout' "Patron checkout action"

require_literal "community.html" '<strong>READ ONLY.</strong>' "Community read-only state"
require_literal "community.html" 'id="forum-root"' "Community board hook"
require_literal "community.html" 'Posting, replies, reactions, and local drafts are not connected.' "Community posting boundary"
require_literal "community.html" '<script src="js/forum.js" defer></script>' "Community read-only board renderer"
require_literal "js/forum.js" 'all[i].id === threadId && all[i].boardId === boardId' "Community thread-to-board binding"
for literal in 'fetch(' 'XMLHttpRequest' 'WebSocket' 'sendBeacon' 'indexedDB' 'localStorage' 'sessionStorage' 'contenteditable'; do
  forbid_literal "js/forum.js" "$literal" "Community client-side posting authority"
done

require_literal "support.html" "WARDEN'S HELP DESK" "Support title"
require_literal "support.html" 'SUPPORT CHANNEL NOT CONNECTED' "Disconnected support channel state"
require_literal "support.html" 'id="diagnostic-form"' "Safe diagnostic helper"
require_literal "support.html" 'id="copy-diagnostics" type="button"' "Copy-only diagnostic action"
require_literal "support.html" '<script src="js/support.js" defer></script>' "Safe diagnostic helper script"
for literal in \
  '"Version: " + release.version_name' \
  '"Build: " + release.version_code' \
  'Supported Android: 8.0+ (API 26+)' \
  'Page: " + location.pathname.split("/").pop()' \
  'Device model: ' \
  'Android version: ' \
  'Issue category: '; do
  require_literal "js/support.js" "$literal" "Safe diagnostic field"
done
for literal in 'fetch(' 'XMLHttpRequest' 'WebSocket' 'sendBeacon' 'indexedDB' 'document.cookie' 'localStorage' 'sessionStorage' 'csrf' 'bearer'; do
  forbid_literal "js/support.js" "$literal" "Support diagnostic secret/network access"
done

require_literal "js/app.js" 'var DOWNLOAD_URL = "/download/akalynth-beta-v12.apk";' "Canonical Android download target"
require_literal "js/app.js" 'fetch(API_BASE + "/v1/client/android-update?lane=prod"' "Authoritative prod Android release lookup"
require_literal "js/app.js" 'credentials: "omit"' "Credential-free public release lookup"
require_literal "js/app.js" 'apk.hostname !== "akalynth.com"' "Android release URL authority validation"
require_literal "js/app.js" 'present !== 0 && present !== provenance.length' "Complete Android provenance set"
forbid_literal "js/app.js" 'PLAY_URL' "Browser-play URL constant"

# Enforce the public product direction without outlawing the immutable APK
# filename or the internal /v1/beta/me compatibility request. HTML is checked
# as rendered text, so comments, URLs, and source-only compatibility names do
# not masquerade as visible release-stage marketing.
python3 - "$repo_root" "${required_pages[@]}" <<'PY'
import re
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse

root = Path(sys.argv[1]).resolve()
pages = [Path(value) for value in sys.argv[2:]]
canonical_apk = "/download/akalynth-beta-v12.apk"
canonical_checksum = canonical_apk + ".sha256"
errors = []


class PublicTextParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.hidden_depth = 0
        self.visible = []
        self.apk_hrefs = []
        self.named_fields = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag in {"script", "style", "template"}:
            self.hidden_depth += 1
        href = attrs.get("href", "")
        if href and ".apk" in urlparse(href).path:
            self.apk_hrefs.append(href)
            if href.endswith(".apk.sha256") and "data-android-checksum" not in attrs:
                errors.append(f"APK checksum link is not bound to the release record: {href}")
            if href.endswith(".apk") and "data-android-download" not in attrs:
                errors.append(f"APK link is not bound to the release record: {href}")
        if tag in {"input", "select", "textarea"} and attrs.get("name"):
            self.named_fields.append(attrs["name"])

    def handle_endtag(self, tag):
        if tag in {"script", "style", "template"} and self.hidden_depth:
            self.hidden_depth -= 1

    def handle_data(self, data):
        if not self.hidden_depth:
            self.visible.append(data)


stage_re = re.compile(r"\b(?:pre[ -]?alpha|alpha|beta)\b", re.IGNORECASE)
for page in pages:
    parser = PublicTextParser()
    source = (root / page).read_text(encoding="utf-8")
    parser.feed(source)
    if re.search(r"(?:href|src)\s*=\s*[\"']/play(?:/|[\"'])", source, re.IGNORECASE):
        errors.append(f"{page}: browser-play route is forbidden")
    if re.search(r"f[ -]?droid", source, re.IGNORECASE):
        errors.append(f"{page}: F-Droid distribution reference is forbidden")
    visible = " ".join(parser.visible)
    visible = visible.replace("akalynth-beta-v12.apk.sha256", "")
    visible = visible.replace("akalynth-beta-v12.apk", "")
    match = stage_re.search(visible)
    if match:
        errors.append(f"{page}: visible release-stage wording is forbidden: {match.group(0)!r}")
    if re.search(r"play\s+in\s+(?:your\s+)?browser", visible, re.IGNORECASE):
        errors.append(f"{page}: browser-play marketing wording is forbidden")
    if re.search(r"f[ -]?droid", visible, re.IGNORECASE):
        errors.append(f"{page}: F-Droid distribution wording is forbidden")
    for href in parser.apk_hrefs:
        if href not in {canonical_apk, canonical_checksum}:
            errors.append(f"{page}: non-canonical APK/checksum target: {href}")
    if page == Path("support.html"):
        fields = set(parser.named_fields)
        if fields != {"device", "android", "category"}:
            errors.append(
                "support.html: diagnostic named fields must be exactly "
                f"device/android/category; found {sorted(fields)!r}"
            )

js_string_re = re.compile(r'"(?:\\.|[^"\\])*"|\'(?:\\.|[^\'\\])*\'|`(?:\\.|[^`\\])*`')
for relative in (Path("js/app.js"), Path("js/forum.js"), Path("js/support.js")):
    source = (root / relative).read_text(encoding="utf-8")
    if re.search(r"(?:^|[\"'])/play(?:/|[\"'])", source):
        errors.append(f"{relative}: browser-play route is forbidden")
    if re.search(r"play\s+in\s+(?:your\s+)?browser", source, re.IGNORECASE):
        errors.append(f"{relative}: browser-play marketing wording is forbidden")
    if re.search(r"f[ -]?droid", source, re.IGNORECASE):
        errors.append(f"{relative}: F-Droid distribution wording is forbidden")
    for token in js_string_re.findall(source):
        value = token[1:-1]
        value = value.replace(canonical_checksum, "")
        value = value.replace(canonical_apk, "")
        value = value.replace("/v1/beta/me", "")
        match = stage_re.search(value)
        if match:
            errors.append(
                f"{relative}: release-stage wording in a client-visible string is forbidden: {value!r}"
            )

if errors:
    for error in errors:
        print(f"::error::{error}", file=sys.stderr)
    sys.exit(1)

print("Android-only public route/copy check passed.")
PY

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

refresh_checks = [
    (
        "shop purchase",
        'api("/v1/shop/purchase", { method: "POST"',
        30,
        ("loadWalletState", 'endMutation("shop", itemId)'),
    ),
    (
        "property buy/unlist",
        'api(buy ? "/v1/property/buy" : "/v1/property/unlist"',
        35,
        ("loadWalletState", "loadHouseCards", "endMutation(kind, id)"),
    ),
    (
        "property list",
        'api("/v1/property/list"',
        35,
        ("loadHouseCards", 'endMutation("property-list", id)'),
    ),
]

for label, marker, window, required in refresh_checks:
    for idx, line in enumerate(lines):
        if marker not in line:
            continue
        context = "\n".join(lines[idx : idx + window + 1])
        for expected in required:
            if expected not in context:
                errors.append(
                    f"{label}: missing nearby post-acceptance {expected} before line {idx + window + 1}"
                )

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
    if ref.startswith("#"):
        return True
    path = parsed.path or ref
    # APK and checksum artifacts are served alongside, but outside, this static
    # repository. Browser-game routes are deliberately not exempted.
    if path.startswith("/download/"):
        return True
    return False


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
