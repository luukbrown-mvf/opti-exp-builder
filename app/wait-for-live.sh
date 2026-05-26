#!/usr/bin/env bash
# wait-for-live.sh <qa_url> <marker> [<open_url>]
#
# Polls the QA URL in a real headless browser (via app/check-live.js) until
# `marker` appears in the rendered page HTML. Then opens `open_url`
# (defaults to qa_url) in Chrome incognito.
#
# Pick `marker` as a short unique string from the latest published variation
# code — e.g. a freshly-changed CSS color (`#00ff88`), a unique JS text
# (`"Select your birth year"`), or anything that wasn't on the page before
# the publish.

set -u

QA_URL="${1:?qa_url required}"
MARKER="${2:?marker required (unique string expected after Optimizely applies)}"
OPEN_URL="${3:-$QA_URL}"

INTERVAL="${INTERVAL:-30}"
TIMEOUT="${TIMEOUT:-1200}"  # 20 min — Optimizely edge cache can be slow
LOG="/tmp/optly-wait.log"

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NODE="${NODE:-node}"

open_chrome_incognito() {
  local url="$1"
  case "$(uname -s)" in
    Linux*)
      if grep -qi microsoft /proc/version 2>/dev/null; then
        cmd.exe /c start chrome --incognito --new-window "$url" >/dev/null 2>&1 && return 0
      fi
      for bin in google-chrome google-chrome-stable chromium chromium-browser; do
        if command -v "$bin" >/dev/null 2>&1; then
          nohup "$bin" --incognito --new-window "$url" >/dev/null 2>&1 &
          return 0
        fi
      done
      ;;
    Darwin*)
      open -na "Google Chrome" --args --incognito --new-window "$url" && return 0
      ;;
    MINGW*|MSYS*|CYGWIN*)
      start chrome --incognito --new-window "$url" && return 0
      ;;
  esac
  return 1
}

banner() {
  printf '\a\n'
  printf '╔══════════════════════════════════════════════════════════════╗\n'
  printf '║  %-60s║\n' "$1"
  printf '║  %-60s║\n' "$2"
  printf '╚══════════════════════════════════════════════════════════════╝\n\n'
}

log() { printf '%s  %s\n' "$(date +%H:%M:%S)" "$1" | tee -a "$LOG"; }

log "Waiting for Optimizely to publish your changes to the live page."
log "(I'm loading the QA URL every ${INTERVAL}s and checking the rendered HTML for: $MARKER)"

elapsed=0
while [ "$elapsed" -lt "$TIMEOUT" ]; do
  if "$NODE" "$REPO_ROOT/app/check-live.js" "$QA_URL" "$MARKER" 2>/dev/null; then
    log "Live! Opening Chrome to QA (took ${elapsed}s)."
    banner "Your changes are live on the page" "Opening Chrome incognito (${elapsed}s)"
    if ! open_chrome_incognito "$OPEN_URL"; then
      echo "Couldn't open Chrome — open this in incognito yourself: $OPEN_URL"
    fi
    exit 0
  fi
  log "Not live yet (${elapsed}s)..."
  sleep "$INTERVAL"
  elapsed=$((elapsed + INTERVAL))
done

log "Gave up after $((TIMEOUT/60)) min. Open the QA URL manually."
banner "Optimizely didn't publish in $((TIMEOUT/60)) min" "Open the QA URL manually:"
echo "$OPEN_URL"
exit 1
