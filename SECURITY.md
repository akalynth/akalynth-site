# Security Policy

This repository is public for transparency and preview of the Akalynth website.
It contains the static public site only. It does not contain the Akalynth game
server, account/session authority, live economy authority, payment processing,
runtime state, receipt authority, anti-cheat enforcement logic, operator
credentials, or private infrastructure. Static account, character, shop, work,
wallet, and housing pages may call named Akalynth API endpoints, but authority
stays on the server and receipt/verifier side.

## Reporting Security Issues

Do not report vulnerabilities by opening public issues.

Do not include secrets, exploit payloads, private infrastructure details,
account data, payment data, host paths, tokens, or credentials in public
reports.

Security contact: pending public disclosure process.

Until a public private-reporting process is announced, security reports are
maintainer-controlled and should not be posted publicly in this repository.

## Scope

In scope:

- Static website files in this repository
- Public preview copy and public-safe assets
- Repository governance files

Out of scope:

- The Akalynth game server
- Private runtime infrastructure
- Account/session authority behind the static account portal
- Payment processing
- House ownership settlement
- Auction settlement
- Anti-cheat enforcement internals
- Operator tooling or deployment systems

## No Bounty Or SLA

No bug bounty, reward, response-time SLA, or remediation commitment is implied
unless separately announced by Akalynth.

## Public Disclosure

Do not publicly disclose security findings, exploit details, or reproduction
payloads until Akalynth has explicitly approved disclosure.
