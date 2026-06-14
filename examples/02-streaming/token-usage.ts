// bun run examples/02-streaming/token-usage.ts

import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

const stream = await client.messages.create({
  model: process.env.ANTHROPIC_DEFAULT_SONNET_MODEL ?? 'claude-sonnet-4-6',
  max_tokens: 256,
  messages: [{ role: 'user', content: 'List three uses for streaming.' }],
  stream: true,
});

let inputTokens = 0;
let outputTokens = 0;
for await (const event of stream) {
  if (event.type === 'message_start') {
    inputTokens = event.message.usage.input_tokens;
  } else if (event.type === 'message_delta') {
    outputTokens = event.usage.output_tokens;
    // Anthropic reports input_tokens on message_start; some gateways report it here.
    if (!inputTokens) inputTokens = event.usage.input_tokens ?? 0;
  }
}

console.log('input_tokens:', inputTokens);
console.log('output_tokens:', outputTokens);
console.log('total_tokens:', inputTokens + outputTokens);
