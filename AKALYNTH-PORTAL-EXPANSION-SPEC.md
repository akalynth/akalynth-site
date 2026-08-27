# Akalynth Android Companion Portal Expansion

This document records the authority boundary for the Android-focused Akalynth
public site. It separates current server and Android facts from what this site
implements and from concepts that are deliberately non-live.

The portal remains a static HTML, CSS, and JavaScript client. It can present
server state and submit existing API commands, but it is never authoritative
for accounts, characters, gold, inventory, property ownership, or receipts.

## SOURCE-BACKED

### Android distribution

The Android client source in `akalynth/akalynth` currently establishes:

- application ID `com.akalynth.client`;
- version name `0.1.19-prod-v12`;
- version code `2026082401`;
- minimum SDK 26, equivalent to Android 8.0 or newer;
- direct APK path `/download/akalynth-beta-v12.apk`;
- checksum path `/download/akalynth-beta-v12.apk.sha256`.

The immutable filename retains `beta` for artifact compatibility. That filename
is not used as a public release-stage claim. Neither APK byte size nor a digest
value is copied into site content; the checksum file remains the authority for
the current digest.

### Account and character authority

The authoritative account and character router source
provide account registration, sign-in, current-account lookup, email
verification, password reset, sign-out, public world/outfit catalogs, and an
account-owned character roster.

Character creation accepts only catalog-backed `name`, `world_id`, `sex`, and
`outfit_id` values. Character selection accepts a `character_id` belonging to
the signed-in account. The portal does not add classes, levels, equipment,
stats, achievements, playtime, deletion, or rename behavior.

### Economy and property authority

The authoritative web economy router source
establishes these rules:

- shop products come from the public catalog and use gold;
- wallet reads and all mutations resolve an account-owned character;
- mutations require the account session and matching CSRF value;
- shop purchases and property purchases succeed only after the server checks
  affordability and writes the authoritative receipts;
- a listing price is a positive integer within the server limit;
- a listed property's price cannot be changed in place: it must be unlisted,
  then listed again;
- property market reads expose an anonymized owner display name, not a raw
  player identifier;
- the current High City map defines three stable property IDs (`Azura:H1`,
  `Azura:H2`, and `Azura:H3`), while the public market omits owned, unlisted
  properties and the public ledger exposes their owner display name;
- fixed-price primary sales and player resale listings are live semantics;
- auction projection types exist elsewhere in the game source, but there is no
  supported portal bidding flow.

### Community and support authority

`js/forum.js` supplies the current public, read-only board and official seed
thread fixture. It does not provide posting authority. The established boards
are The High City Square, High City Board, Plots & Trade, The Guild Hall,
Wardens' Help Desk, and The Tavern.

No authoritative public support email, ticket endpoint, or connected support
service was found in the current site or server source. The public support
surface must therefore remain self-service and say `SUPPORT CHANNEL NOT
CONNECTED`.

### Visual authority

The accepted Claude handoff is a visual and interaction reference, not runtime
authority. The implementation reuses the repository's existing High City art,
self-hosted Cinzel and Inter fonts, dark panel language, 4px corners, and gold
palette (`#e5b75c` and `#ffd982`) on `#050910`. The raw handoff archive is not a
runtime dependency and is not committed.

## IMPLEMENTED

### Public information architecture

The companion portal provides these static destinations:

| Destination | File or anchor | Live responsibility |
| --- | --- | --- |
| Home / High City | `index.html`, `index.html#world` | Android-focused world presentation and direct download path |
| Houses | `houses.html` | Housing explainer, separate from transactions |
| House Market | `market.html` | Server-backed fixed-price primary and resale registry |
| Coin Exchange | `shop.html` | Catalog-backed gold purchases and current wallet context |
| Library | `library.html` | Existing public library surface |
| Characters | `account.html` | Account, roster, create, and select companion flows |
| Community | `community.html` | Read-only boards and official seed threads |
| Support | `support.html` | Self-service help and safe diagnostic-copy helper |
| Download | `download.html` | APK install and checksum-verification guidance |
| Legacy download link | `beta.html` | Compatibility forwarding to the Android download page |

Primary navigation keeps the Android APK action persistent and keeps account /
selected-character identity separate from destination links. Completing a
character flow continues to the Android download, not to browser gameplay.

### Endpoint and action mapping

| Portal action | Server contract | Authority and result handling |
| --- | --- | --- |
| Restore session | `GET /v1/accounts/me` | Server session decides signed-in state |
| Register | `POST /v1/accounts/register` | Server validates account fields and returns acceptance/errors |
| Sign in | `POST /v1/accounts/login` | Server issues the session and CSRF cookies |
| Verify email | `POST /v1/accounts/verify-email` | Server validates the verification token |
| Request/confirm reset | `POST /v1/accounts/password-reset/request`, `POST /v1/accounts/password-reset/confirm` | Server owns reset validity; URL fragment tokens are scrubbed after binding |
| Sign out | `POST /v1/accounts/logout` | Requests server sign-out; the portal reports when it can clear only its local projection |
| Load creation options | `GET /v1/worlds`, `GET /v1/outfits` | Public catalogs define the values shown in character creation |
| Load roster | `GET /v1/characters` | Account session determines the returned characters |
| Create character | `POST /v1/characters` | Sends only `name`, `world_id`, `sex`, and `outfit_id`; requires session and CSRF |
| Select character | `POST /v1/characters/select` | Sends `character_id`; server verifies account ownership |
| Load gold | `GET /v1/wallet?character_id=...` | Server verifies selected-character ownership and returns `balance_gold` |
| Load shop | `GET /v1/shop/catalog` | Cards use only returned catalog fields |
| Buy shop item | `POST /v1/shop/purchase` | Sends selected `character_id` and `shop_key`; UI confirms only after acceptance and refresh |
| Load registry | `GET /v1/property/market` | Public, anonymized projection of primary and resale availability |
| Load property history | `GET /v1/property/ledger?property_id=...` | Public history for each current source-backed High City property ID; this keeps owned, unlisted plots discoverable without treating a browser mutation response as ownership |
| Buy property | `POST /v1/property/buy` | Sends selected `character_id` and `property_id`; UI refreshes authoritative market and wallet after acceptance |
| List property | `POST /v1/property/list` | Sends selected `character_id`, `property_id`, and positive `price_gold` |
| Unlist property | `POST /v1/property/unlist` | Sends selected `character_id` and `property_id`; relisting is a separate action |
| Load optional access projection | `GET /v1/beta/me` | Compatibility-only account projection; it does not create browser-play or public stage messaging |

All fetches use the current API origin with credentials included. Consequential
commands are disabled while pending, include the current CSRF header, and do not
convert a click into local ownership, inventory, or balance truth. An accepted
mutation is followed by server-backed state refresh.

### Major UI and error states

| Surface | Implemented states |
| --- | --- |
| Account / Characters | signed out, sign-in and supported registration, loading, account error, expired session, no characters, roster, create character, selected character, sign-out |
| House Market | loading, API unavailable, available primary plot, resale listing, owned by selected character, owned/not for sale, review, mutation pending, accepted/refreshed, and rejected |
| Property rejection | insufficient gold, no longer for sale/already sold, buying own property, invalid listing price, not owner, missing character, expired session/CSRF, and network/server failure |
| Coin Exchange | loading, catalog unavailable, small catalog-backed inventory, missing account/character, purchase review, pending, accepted/refreshed, insufficient gold, unknown item, expired session/CSRF, and network/server failure |
| Community | board index, thread list, thread view, breadcrumbs, official/seed status, and read-only/locked status |
| Support | FAQ groups, install/checksum help, account/character help, housing/shop help, technical troubleshooting, conduct guidance, and safe diagnostic copy |
| Download | supported Android version, immutable APK action, checksum link, install steps, and verification guidance |

The diagnostic helper includes only the public app version/build, supported
Android version, current page, issue category, and device/Android values entered
by the user. It never reads or copies passwords, cookies, CSRF values, session or
bearer tokens, account secrets, or private API responses.

## DESIGN PROPOSAL

### High City Patron Pack

The Coin Exchange includes a visually separate future concept named **High City
Patron Pack**. It is labeled `NOT YET AVAILABLE` and `PRICE NOT SET` and has no
enabled purchase path.

Possible cosmetic-only ideas shown as proposals are a Patron portrait frame,
sigil or nameplate, High City dye or cloak, decorative house banner or
furniture, community badge, and supporter acknowledgement. These are design
ideas only. The portal does not claim that any entitlement exists, and none
provides gameplay advantage.

No design-proposal interaction writes browser-local purchase, ownership, or
entitlement state.

## UNKNOWN / OWNER DECISION

- Patron Pack price and currency.
- Payment provider, checkout flow, refund policy, and premium entitlement
  contract.
- Which proposed Patron cosmetics, if any, should become production content.
- Authoritative public support contact or ticket backend.
- Server-backed community posting, moderation, edit, and identity contract.
- An account-aware owned-property read contract for future maps whose property
  IDs are not yet part of the current High City source fixture.
- Whether a future verified Android app-link can offer an `OPEN AKALYNTH`
  action distinct from downloading the APK.

Until those decisions have source-backed contracts, the corresponding controls
stay absent or explicitly non-live.

## NOT CLAIMED

This portal intentionally does **not** claim or implement:

- browser play, a browser client, or `/play/` as a distribution path;
- F-Droid distribution;
- visible alpha, pre-alpha, or beta stage marketing (apart from the immutable
  APK filename);
- live property auctions or bidding;
- live premium checkout, price, subscription, refund, or entitlement;
- live community posting or browser-local user posts;
- unsupported classes, stats, equipment, achievements, playtime, quests,
  currencies, character deletion, or character rename;
- cash-purchased gold, pay-to-win items, XP or damage boosts, cooldown or
  property priority, or auction priority;
- unverified HUD atoms as screenshots of the shipped Android runtime;
- an APK byte size or embedded SHA-256 value without an authoritative current
  release manifest;
- client-side account, character, inventory, wallet, property, or receipt
  authority.
