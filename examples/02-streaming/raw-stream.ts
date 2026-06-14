// bun run examples/02-streaming/raw-stream.ts

import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();
const stream = await client.messages.create({
  model: process.env.ANTHROPIC_DEFAULT_SONNET_MODEL ?? 'claude-sonnet-4-6',
  max_tokens: 256,
  messages: [{ role: 'user', content: 'Name three primary colors.' }],
  stream: true,
});

// This is the raw SSE sequence the MessageStream helper wraps for you.
for await (const event of stream) {
  if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
    console.log(`${event.type}  text: ${JSON.stringify(event.delta.text)}`);
  } else {
    console.log(event.type);
  }
}
