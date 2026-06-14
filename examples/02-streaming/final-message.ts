// bun run examples/02-streaming/final-message.ts

import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

const stream = client.messages.stream({
  model: process.env.ANTHROPIC_DEFAULT_SONNET_MODEL ?? 'claude-sonnet-4-6',
  max_tokens: 256,
  messages: [{ role: 'user', content: 'In one sentence, what is a coding agent?' }],
});

// finalMessage() resolves once the stream ends, assembling the identical
// Anthropic.Message a blocking create() would have returned - deltas already merged.
const message: Anthropic.Message = await stream.finalMessage();

console.log('id:', message.id);
console.log('model:', message.model);
console.log('stop_reason:', message.stop_reason);
console.log('input_tokens:', message.usage.input_tokens);
console.log('output_tokens:', message.usage.output_tokens);

const text = message.content
  .filter((block): block is Anthropic.TextBlock => block.type === 'text')
  .map((block) => block.text)
  .join('');
console.log('text:', text);
