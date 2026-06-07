#!/usr/bin/env bash
# bash examples/01-sdk-first-request/curl-equivalent.sh

set -euo pipefail

# A shell does not auto-load .env like Bun does, so export the key first:
# export ANTHROPIC_API_KEY=sk-ant-...
: "${ANTHROPIC_API_KEY:?Set ANTHROPIC_API_KEY in the environment first}"

# The same request hello.ts makes, on the wire.
curl https://api.anthropic.com/v1/messages \
  --silent --show-error \
  --header "content-type: application/json" \
  --header "x-api-key: ${ANTHROPIC_API_KEY}" \
  --header "anthropic-version: 2023-06-01" \
  --data '{
    "model": "claude-opus-4-8",
    "max_tokens": 1024,
    "messages": [
      { "role": "user", "content": "Hello, Claude! In one sentence, what is the Anthropic Messages API?" }
    ]
  }'
