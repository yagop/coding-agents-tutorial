// bun run examples/02-streaming/manual-delta.ts

import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

const stream = client.messages.stream({
  model: process.env.ANTHROPIC_DEFAULT_SONNET_MODEL ?? 'claude-sonnet-4-6',
  max_tokens: 256,
  messages: [{ role: 'user', content: 'In two sentences, describe a sunrise.' }],
});

// MessageStream is an AsyncIterable<MessageStreamEvent>, so skip .on('text') and
// build the reply yourself: narrow each text_delta and append its text.
let text = '';
for await (const event of stream) {
  if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
    text += event.delta.text;
  }
}

console.log(text);
