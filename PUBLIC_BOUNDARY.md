# Public Boundary

This repository contains the public static Akalynth website only.

It may contain:

- Static HTML, CSS, and JavaScript for the public site
- Public-safe screenshots
- Public lore and preview copy
- Static companion pages for account, characters, shop, property, community,
  support, and Android download views
- Public-safe documentation for this static site

It does not contain:

- The Akalynth game server
- Live economy authority
- Account or session authority
- Real house ownership settlement
- Payment processing
- Browser gameplay or a second game client
- Operator credentials
- Runtime state
- Receipt authority
- Anti-cheat enforcement logic
- Private roadmap or planning material

This repository may call public Akalynth API endpoints, including account and
character endpoints, but it does not own the authority behind them. Account,
shop, wallet, work, and housing actions are live only when the server accepts them.
The site disables duplicate submissions and refreshes server-backed state after
accepted mutations. It does not optimistically mint an item or claim property.

Community is read-only because there is no public posting contract. Support
provides FAQ and a user-controlled safe diagnostic-copy helper only; no contact
destination or ticket submission is connected. The Patron Pack is a visibly
non-live design proposal with no price, checkout, payment, or entitlement path.
