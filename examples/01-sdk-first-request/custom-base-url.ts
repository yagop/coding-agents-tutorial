// Point the SAME code at an Anthropic-compatible gateway via a custom baseURL.
// Run: bun run examples/01-sdk-first-request/custom-base-url.ts
//
// The Messages API has a stable request/response shape, so any gateway that
// speaks the Anthropic protocol works with this exact code - only the baseURL
// (and the matching API key) changes. Set these env vars to switch providers:
//
//   # Anthropic direct (default) - leave ANTHROPIC_BASE_URL unset
//   ANTHROPIC_API_KEY=sk-ant-...
//
//   # MiniMax
//   ANTHROPIC_BASE_URL=https://api.minimax.io/anthropic/v1
//   ANTHROPIC_API_KEY=<minimax-key>
//
//   # Z.ai
//   ANTHROPIC_BASE_URL=https://api.z.ai/api/anthropic
//   ANTHROPIC_API_KEY=<zai-key>
//
// new Anthropic() with NO arguments already auto-reads ANTHROPIC_BASE_URL (and
// ANTHROPIC_API_KEY) from the environment, so in practice you can switch
// providers by setting env vars and changing nothing in code. Below we pass
// both explicitly to make the override visible, falling back to Anthropic
// direct when ANTHROPIC_BASE_URL is unset so this file runs either way.

import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  baseURL: process.env.ANTHROPIC_BASE_URL ?? 'https://api.anthropic.com',
  apiKey: process.env.ANTHROPIC_API_KEY,
});

console.log('calling:', client.baseURL);

const message = await client.messages.create({
  // Model IDs differ per provider; on a gateway use whatever model it exposes,
  // overridable here via the MODEL env var.
  model: process.env.MODEL ?? 'claude-sonnet-4-6',
  max_tokens: 128,
  messages: [{ role: 'user', content: 'In one sentence, what is a coding agent?' }],
});

// content is an array of content blocks; narrow on block.type === 'text'
// before reading block.text.
const first = message.content[0];
if (first?.type === 'text') {
  console.log(first.text);
}
