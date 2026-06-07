# Run with: bash examples/01-sdk-first-request/curl-equivalent.sh
#
# Raw curl equivalent of the client.messages.create call from this chapter.
# This is exactly what the Anthropic SDK does for you under the hood: a single
# POST to https://api.anthropic.com/v1/messages with three headers and a JSON
# body. No SDK, no bun, no jq - just curl and the shell.
set -euo pipefail

# 1. Read the API key from the environment. Never hardcode secrets in a script.
#    Exit early with a helpful message if it is missing or empty.
if [ -z "${ANTHROPIC_API_KEY:-}" ]; then
  echo "Error: ANTHROPIC_API_KEY is not set." >&2
  echo "Export your key first, for example:" >&2
  echo "  export ANTHROPIC_API_KEY=sk-ant-..." >&2
  exit 1
fi

# 2. Optionally point at an Anthropic-compatible gateway by exporting
#    ANTHROPIC_BASE_URL (the SDK reads the same variable). Defaults to the
#    Anthropic API. The endpoint path is always /v1/messages.
BASE_URL="${ANTHROPIC_BASE_URL:-https://api.anthropic.com}"

# 3. POST to the Messages endpoint with the three required headers:
#      content-type: application/json
#      x-api-key: <your key>
#      anthropic-version: 2023-06-01
#    The body carries model, max_tokens, and a messages array with one
#    user turn. The body is built with a quoted heredoc so the shell does
#    not expand or mangle the JSON (no jq required).
curl -sS "${BASE_URL}/v1/messages" \
  -H "content-type: application/json" \
  -H "x-api-key: ${ANTHROPIC_API_KEY}" \
  -H "anthropic-version: 2023-06-01" \
  -d @- <<'JSON'
{
  "model": "claude-opus-4-8",
  "max_tokens": 1024,
  "messages": [
    { "role": "user", "content": "In one sentence, what is the Anthropic Messages API?" }
  ]
}
JSON

# The response is JSON printed to stdout. The fields that matter:
#   .content      - array of content blocks; text blocks have a .text string
#   .stop_reason  - end_turn, max_tokens, tool_use, refusal, ...
#   .usage        - input_tokens and output_tokens
#
# To pretty-print or extract a field you could pipe into jq, but this script
# stays runnable without it:
#   bash examples/01-sdk-first-request/curl-equivalent.sh | jq .
#   bash examples/01-sdk-first-request/curl-equivalent.sh | jq -r '.content[0].text'