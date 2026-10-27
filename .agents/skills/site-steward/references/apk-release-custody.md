# APK release custody: field rules and fallback bumps

Read this before editing `ANDROID_RELEASE_FALLBACK`, `DOWNLOAD_URL`, any
`data-android-*` target, the release fields in `js/support.js`, or the
canonical filename pinned in `scripts/check-static-site.sh`.

## Release record rules

`validAndroidRelease` in `js/app.js` applies a record from
`GET /v1/client/android-update?lane=prod` only if every rule holds:

| Field | Rule |
| --- | --- |
| `ok` | `true` |
| `lane` | `"prod"` |
| `version_code` | safe integer, at least 1 |
| `version_name` | non-empty string ending in `-vN` (N at least 1, no leading zero) |
| `apk_url` | `https:`, host `akalynth.com`, path `/download/akalynth-beta-vN.apk` for the same N; no user, password, port, query, or fragment |
| `apk_sha256` | 64 lowercase hex characters |
| `size_bytes` | safe integer, at least 1 |
| `required` | boolean |
| `published_at` | parseable timestamp ending in `Z` |
| `source_commit`, `ui_contract`, `signing_certificate_sha256` | all absent, or all present as 40 hex / lowercase slug / 64 hex |

`applyAndroidRelease` then:

- points every `data-android-download` href and aria-label at `apk_url`, and every `data-android-checksum` href at `apk_url + ".sha256"`;
- fills the text of `data-android-version`, `-version-code`, `-apk-name`, `-sha256`, `-size`, `-published`, `-source`, `-ui-contract`, `-signer`, and `-verify-command`;
- sets `data-android-inspector-status` to the live or fallback message;
- stores the record on `window.AKALYNTH_ANDROID_RELEASE` and dispatches `akalynth:android-release`, which `js/support.js` listens for.

The checked-in fallback goes through the same function, unvalidated and marked
as not live. On fetch or validation failure the fallback is re-applied.

If you change these rules, update the release assertions in
`scripts/verify-site-e2d-character-gameplay.mjs` in the same commit. The static
check also pins `credentials: "omit"`, `apk.hostname !== "akalynth.com"`, and the
all-or-nothing provenance line, so keep those literals or change the check on
purpose.

## Bumping the checked-in fallback

The fallback is what visitors see without JavaScript or when the API is down,
so it must name a release that is already published. Bump it only when a
maintainer or the operator names the target release record. Don't revive an old
bump branch on your own.

1. Copy every value from that record: `version_code`, `version_name`, `apk_sha256`, `size_bytes`, `required`, `published_at`, and the provenance triple if the record has one. Never compute a digest or size here; the APK is not in this repo.
2. Edit the whole touch set in one change:
   - `js/app.js`: `DOWNLOAD_URL` and `ANDROID_RELEASE_FALLBACK`.
   - `js/support.js`: the fallback `version_name` and `version_code`.
   - Every page with `data-android-download` or `data-android-checksum` links (`git grep -l 'data-android-' -- '*.html'`), including the static inspector values, verify command, and aria-labels in `download.html` and the version and build text in `index.html`.
   - `scripts/check-static-site.sh`: the `require_literal` lines for `download.html` and `support.html`, the `DOWNLOAD_URL` literal, `canonical_apk`, and the two `visible.replace(...)` filename exemptions.
   - `README.md` ("Android release binding") and `AKALYNTH-PORTAL-EXPANSION-SPEC.md` ("Android distribution").
3. Prove nothing stale remains. This must print nothing:

   ```bash
   git grep -n -e 'akalynth-beta-v<old N>' -e '<old version_name>' \
     -e '<old version_code>' -e '<old apk_sha256>'
   ```

   Then run `./scripts/verify-account-character-site.sh` and `git diff --check`.
4. If `signing_certificate_sha256` changes, existing installs may need an uninstall and reinstall: Android updates in place across a signer change only when the new APK carries a key-rotation lineage from the old key. Flag it to the operator in the PR; don't write install copy about it on your own.

## Publish ordering

CI cannot see `/download/`. The PR body must name the artifact the new fallback
points at and state that it, with its `.sha256`, has to be in `/download/`
before this site commit is published; otherwise the no-JavaScript download and
checksum links break. The order and the publish itself are the operator's call.
The site PR only states the dependency.
