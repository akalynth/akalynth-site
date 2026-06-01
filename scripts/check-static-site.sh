#!/usr/bin/env bash
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

required_pages=(index.html shop.html houses.html account.html)

for page in "${required_pages[@]}"; do
  if [[ ! -f "$page" ]]; then
    printf '::error::Required page missing: %s\n' "$page" >&2
    exit 1
  fi
done

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

printf 'Static site smoke test passed.\n'
