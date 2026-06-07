// bun run examples/01-sdk-first-request/pick-a-model.ts
//
// Send the same prompt to Opus, Sonnet, and Haiku and compare token usage.

import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

// claude-opus-4-8   - most capable, best for hard reasoning and coding
// claude-sonnet-4-6 - balance of speed and intelligence; a good default
// claude-haiku-4-5  - fastest and cheapest, best for high-volume simple work
const models: Anthropic.Model[] = ['claude-opus-4-8', 'claude-sonnet-4-6', 'claude-haiku-4-5'];

for (const model of models) {
  const message = await client.messages.create({
    model,
    // max_tokens is an UPPER BOUND on the reply, not a target length. The model
    // stops when it is done (stop_reason 'end_turn'); it only runs to this many
    // tokens if it has that much to say, in which case stop_reason is 'max_tokens'.
    max_tokens: 128,
    messages: [{ role: 'user', content: 'In one sentence, what is a coding agent?' }],
  });

  // message.content is an array of content blocks. Narrow on block.type === 'text'
  // before reading block.text so TypeScript knows .text exists on this block.
  const first = message.content[0];
  const text = first?.type === 'text' ? first.text : '';
  console.log(`\n=== ${model} ===`);
  console.log(text);
  console.log(
    `tokens: in=${message.usage.input_tokens} out=${message.usage.output_tokens} stop=${message.stop_reason}`,
  );
}
