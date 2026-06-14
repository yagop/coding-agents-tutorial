#!/usr/bin/env bash
# bash examples/01-sdk-first-request/curl-equivalent.sh

set -euo pipefail

# A shell does not auto-load .env like Bun does, so export your vars first - either
# ANTHROPIC_API_KEY (Anthropic direct) or ANTHROPIC_AUTH_TOKEN + ANTHROPIC_BASE_URL.
base="${ANTHROPIC_BASE_URL:-https://api.anthropic.com}"
model="${ANTHROPIC_DEFAULT_OPUS_MODEL:-claude-opus-4-8}"

# Bearer auth when a provider token is set, otherwise Anthropic's x-api-key.
if [ -n "${ANTHROPIC_AUTH_TOKEN:-}" ]; then
  auth=(--header "authorization: Bearer ${ANTHROPIC_AUTH_TOKEN}")
else
  auth=(--header "x-api-key: ${ANTHROPIC_API_KEY:?Set ANTHROPIC_API_KEY or ANTHROPIC_AUTH_TOKEN first}")
fi

# The same request hello.ts makes, on the wire.
curl "${base}/v1/messages" \
  --silent --show-error \
  --header "content-type: application/json" \
  "${auth[@]}" \
  --header "anthropic-version: 2023-06-01" \
  --data @- <<EOF
{
  "model": "${model}",
  "max_tokens": 1024,
  "messages": [
    { "role": "user", "content": "Hello, Claude! In one sentence, what is the Anthropic Messages API?" }
  ]
}
EOF
