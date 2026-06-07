# Run with: bash examples/01-sdk-first-request/curl-equivalent.sh
#
# The same request the @anthropic-ai/sdk makes, as raw curl. This is what
# client.messages.create sends under the hood: a POST to /v1/messages with
# three headers (content-type, x-api-key, anthropic-version) and a JSON body
# containing model, max_tokens, and a messages array.
#
# No jq required. The full JSON response is printed to stdout as-is.
set -euo pipefail

# The SDK reads the key from ANTHROPIC_API_KEY in the environment. We do the
# same here. Never hardcode a key in a script; keep it in the environment.
if [ -z "${ANTHROPIC_API_KEY:-}" ]; then
  echo "Error: ANTHROPIC_API_KEY is not set." >&2
  echo "Export your Anthropic API key first, for example:" >&2
  echo "  export ANTHROPIC_API_KEY=sk-ant-..." >&2
  exit 1
fi

# The SDK also honors ANTHROPIC_BASE_URL for Anthropic-compatible gateways
# (proxies, Bedrock/Vertex fronts, or providers like https://api.z.ai/api/anthropic).
# Default to the Anthropic API when it is unset.
BASE_URL="${ANTHROPIC_BASE_URL:-https://api.anthropic.com}"

curl --silent --show-error --fail-with-body \
  "${BASE_URL}/v1/messages" \
  --header "content-type: application/json" \
  --header "x-api-key: ${ANTHROPIC_API_KEY}" \
  --header "anthropic-version: 2023-06-01" \
  --data '{
    "model": "claude-opus-4-8",
    "max_tokens": 1024,
    "messages": [
      { "role": "user", "content": "Hello, Claude. Reply in one short sentence." }
    ]
  }'

# A trailing newline so the JSON response is not glued to your next prompt.
echo
