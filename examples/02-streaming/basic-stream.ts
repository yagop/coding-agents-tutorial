// bun run examples/02-streaming/basic-stream.ts

import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

const stream = client.messages.stream({
  model: process.env.ANTHROPIC_DEFAULT_SONNET_MODEL ?? 'claude-sonnet-4-6',
  max_tokens: 256,
  messages: [{ role: 'user', content: 'In two sentences, what is streaming good for?' }],
});

// 'text' fires once per incremental chunk; write it with no newline to paint in place.
stream.on('text', (delta) => process.stdout.write(delta));

await stream.finalMessage();
process.stdout.write('\n');
