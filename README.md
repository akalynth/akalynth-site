# Akalynth Site

This repository contains the public static Akalynth website and portal frontend.

It is an Android-only companion site for Akalynth's High City surface:

- `index.html` public landing and High City presentation
- `download.html` canonical Android APK and checksum instructions
- `beta.html` compatibility redirect to the Android download page
- `houses.html` public High City housing explainer
- `market.html` server-backed House Registry companion surface
- `shop.html` server-backed Coin Exchange and non-live Patron proposal
- `account.html` account and character companion portal
- `register.html` paste-only invite entry path into the existing account portal
- `forgot.html` password-reset entry and confirmation path into the existing account portal
- `community.html` read-only official/seed community boards
- `forum.html` compatibility redirect that preserves board/thread queries
- `support.html` FAQ and safe diagnostic-copy helper; no submission channel
- `library.html` public-safe visual lore archive
- `wallpapers.html` secondary public visual archive
- `css/` and `js/` assets used by the static site

## Boundary

This repository does not contain the Akalynth game server, live economy
authority, account authority, payment processing, runtime state, receipt
authority, anti-cheat enforcement logic, operator tooling, hosting credentials,
or private roadmap material.

The account, shop, wallet, work, and housing pages are static frontends that call
named Akalynth API endpoints when available. This repository still does not
contain account authority, session authority, receipt signing, economy authority,
or runtime state. Shop and housing pages do not use browser-local state as
authority; purchases and property actions are shown as accepted only after the
server accepts them, and server-backed state is refreshed after mutations.

The account portal may submit an explicitly pasted invite with registration.
Invite values are never read from the page URL. The optional legacy access
projection remains an internal compatibility request; it is not rendered as a
public release stage or distribution path.

The only play/distribution path advertised by this repository is the direct
Android APK. The website does not embed or launch a browser game.

## Local Preview

Open `index.html` directly in a browser, or serve the directory with any static
file server.

Example:

```bash
python3 -m http.server 8099
```

Then open `http://127.0.0.1:8099/`.

## Verification

Run the account-character site verifier before changing the account portal,
download compatibility route, shop/property API hooks, or public boundary wording:

```bash
./scripts/verify-account-character-site.sh
```

This wraps the static route/link/API-hook smoke test, executable site E2D
character and companion-action proof for account-scoped create/select/shop/work/property
requests, explicit no-session/no-CSRF inline helper proof, Android-only route
assertions, and the public boundary guard.

## Android release binding

The checked-in `/download/akalynth-beta-v13.apk` links are the current
no-JavaScript fallback. At runtime `js/app.js` reads the public,
credential-free prod Android update record, validates its Akalynth HTTPS
authority and complete provenance shape, then updates every
`data-android-download` and `data-android-checksum` target.

`download.html` exposes the same version, build, checksum, source commit, UI
contract, and public signing-certificate fingerprint in a release inspector.
Legacy releases without provenance are labelled as such; the browser never
invents missing values or treats its local state as artifact authority.

Website deployment is owned by the main `akalynth/akalynth` operator runbook
and publisher. This repository does not deploy itself. The operator must name
the exact reviewed site commit, and `/download/` remains the independent
Android artifact lane.

## License

See `LICENSE`.
