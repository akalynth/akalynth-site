# Akalynth Site

This repository contains the public static Akalynth website preview.

It is a pre-alpha, client-side-only site for the World of Azura surface:

- `index.html` public landing and world preview
- `shop.html` static preview storefront
- `houses.html` local housing preview
- `account.html` local character preview
- `css/`, `js/`, and `screenshots/` assets used by the static site

## Boundary

This repository does not contain the Akalynth game server, live economy
authority, account authority, payment processing, runtime state, receipt
authority, anti-cheat enforcement logic, operator tooling, hosting credentials,
or private roadmap material.

Shop, account, and housing interactions are browser-local previews unless they
are explicitly connected to a named server receipt and verifier path in a
future release.

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
