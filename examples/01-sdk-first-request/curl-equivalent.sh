#!/usr/bin/env bash
# The same request as hello.ts, sent with raw curl - no SDK, no jq involved.
# This is essentially what client.messages.create puts on the wire (the SDK
# adds its own default headers like User-Agent on top of these).
# Run: bash examples/01-sdk-first-request/curl-equivalent.sh
#
# Reads ANTHROPIC_API_KEY from the environment. Bun auto-loads .env for .ts
# files, but a shell script does not - export the key first, or source .env:
#   set -a; . ./.env; set +a

set -euo pipefail

# Never hardcode the key. Read it from the environment and fail with a clear
# message if it is missing. (${VAR:-} avoids tripping set -u when unset.)
if [ -z "${ANTHROPIC_API_KEY:-}" ]; then
  echo "ANTHROPIC_API_KEY is not set." >&2
  echo "Export it first, for example:" >&2
  echo "  export ANTHROPIC_API_KEY=sk-ant-..." >&2
  echo "Then re-run: bash examples/01-sdk-first-request/curl-equivalent.sh" >&2
  exit 1
fi

# The three required headers (content-type, x-api-key, anthropic-version) plus a
# JSON body with model, max_tokens, and a single user message. The same shape
# the SDK builds for you. --data implies a POST. --silent --show-error hides the
# progress meter but still surfaces transport errors; the API's JSON (a normal
# reply or an error body) is printed as-is so you can read the raw response.
curl https://api.anthropic.com/v1/messages \
  --silent \
  --show-error \
  --header "content-type: application/json" \
  --header "x-api-key: ${ANTHROPIC_API_KEY}" \
  --header "anthropic-version: 2023-06-01" \
  --data '{
    "model": "claude-opus-4-8",
    "max_tokens": 256,
    "messages": [
      { "role": "user", "content": "In one sentence, what is a coding agent?" }
    ]
  }'