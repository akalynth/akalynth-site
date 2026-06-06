# Akalynth Site

This repository contains the public static Akalynth website and portal frontend.

It is a pre-alpha static site for Akalynth's High City surface:

- `index.html` public landing, High City preview, and Android beta call to action
- `beta.html` public Android beta download pointer
- `shop.html` in-game-currency shop portal for the Akalynth API
- `houses.html` server property market portal for the Akalynth API
- `account.html` static account portal shell for the Akalynth API
- `forum.html` browser-local community boards preview
- `codex.html` and `library.html` public-safe visual lore archive
- `css/`, `js/`, and `screenshots/` assets used by the static site

## Boundary

This repository does not contain the Akalynth game server, live economy
authority, account authority, payment processing, runtime state, receipt
authority, anti-cheat enforcement logic, operator tooling, hosting credentials,
or private roadmap material.

The account, shop, wallet, and housing pages are static frontends that call named
Akalynth API endpoints when available. This repository still does not contain
account authority, session authority, receipt signing, economy authority, or
runtime state. Shop and housing pages do not use browser-local state as
authority; purchases and property actions are settled only when the server emits
the relevant receipts.

## Local Preview

Open `index.html` directly in a browser, or serve the directory with any static
file server.

Example:

```bash
python3 -m http.server 8099
```

Then open `http://127.0.0.1:8099/`.

## License

See `LICENSE`.
