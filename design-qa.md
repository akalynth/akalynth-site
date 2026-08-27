# Android Companion Portal — Design QA

Status: **passed**

## Reference and method

- Visual authority: the accepted uploaded Claude export, `Akalynth.dc.html`,
  and its `evidence/04-index-desktop.png` capture.
- Implementation: this worktree served on loopback with
  `python3 -m http.server 4173 --bind 127.0.0.1`.
- Browser: Chromium 141.0.7390.37, driven headlessly with the already-installed
  Playwright Core runtime. No browser or package was installed for this pass.
- API-backed panels used intercepted, source-shaped, non-production fixtures.
  No live account, character, shop, or property mutation was sent. `SiteProof`
  and `account-visual-qa` in the captures are QA identities, not production
  claims.

## Responsive coverage

The nine principal routes were inspected at 1440px. Additional checks covered
the responsive breakpoints at 1024px, 768px, and 390px. The browser harness
reported:

- zero page exceptions or console errors;
- zero failed network requests;
- zero horizontal-overflow failures;
- zero non-canonical APK/checksum links;
- zero requests containing a literal template expression;
- successful Home → High City navigation with `scrollY = 0`;
- visible keyboard focus;
- reduced-motion media preference honored, with parallax and reveal setup off;
- the 1024px navigation menu visible and operable;
- a mismatched Community board/thread deep link rejected into the requested
  board view instead of showing the wrong thread.

## Visual comparison

The same 924×540 viewport was used for the accepted Claude reference and the
repository implementation in
[`15-home-reference-comparison.jpg`](screenshots/android-companion-v1/15-home-reference-comparison.jpg).
The implementation preserves the accepted High City artwork, near-black field,
gold hierarchy, compact square framing, Android facts, sidebar information,
hero CTA, and restrained typography. The deliberate difference is the compact
navigation control at this width: the expanded route set moves behind a
conventional menu instead of crushing into multiple header rows.

No visible clipping, horizontal overflow, broken image, generic framework
styling, or accidental browser-game CTA was observed. Account, Market, Shop,
Community, and Support surfaces consistently distinguish browser presentation
from server authority.

## Evidence

- `01-home-desktop.jpg`
- `02-high-city-desktop.jpg`
- `03-houses-desktop.jpg`
- `04-house-market-desktop.jpg`
- `05-shop-desktop.jpg`
- `06-characters-desktop.jpg`
- `07-community-desktop.jpg`
- `08-support-desktop.jpg`
- `09-download-desktop.jpg`
- `10-home-reference-viewport.jpg`
- `11-home-compact-menu.jpg`
- `12-shop-tablet.jpg`
- `13-home-mobile.jpg`
- `14-house-market-mobile.jpg`
- `15-home-reference-comparison.jpg`

All files are under `screenshots/android-companion-v1/`.
