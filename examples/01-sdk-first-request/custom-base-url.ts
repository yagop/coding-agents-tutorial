// bun run examples/01-sdk-first-request/custom-base-url.ts

import Anthropic from '@anthropic-ai/sdk';

// Any OpenAI-compatible gateway (OpenRouter, MiniMax, Z.ai, ...) works with this
// exact code via ANTHROPIC_BASE_URL; unset, we fall back to Anthropic direct.
const client = new Anthropic({
  baseURL: process.env.ANTHROPIC_BASE_URL ?? 'https://api.anthropic.com',
});

console.log('calling:', client.baseURL);

const message = await client.messages.create({
  model: process.env.MODEL ?? 'claude-sonnet-4-6',
  max_tokens: 128,
  messages: [{ role: 'user', content: 'In one sentence, what is a coding agent?' }],
});

const first = message.content[0];
if (first?.type === 'text') {
  console.log(first.text);
}
