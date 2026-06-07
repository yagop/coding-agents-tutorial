// bun run examples/01-sdk-first-request/read-response.ts

import Anthropic from '@anthropic-ai/sdk';

// new Anthropic() reads ANTHROPIC_API_KEY from the environment - never hardcode it.
const client = new Anthropic();

// Typing the result as Anthropic.Message surfaces the full response shape.
const message: Anthropic.Message = await client.messages.create({
  model: 'claude-sonnet-4-6',
  max_tokens: 256,
  system: 'You are a concise assistant. Answer in one short paragraph.',
  messages: [{ role: 'user', content: 'In one sentence, what is a coding agent?' }],
});

console.log('id:', message.id);
console.log('model:', message.model);
console.log('role:', message.role);

// stop_reason is why generation stopped ('end_turn' done, 'max_tokens' truncated);
// stop_sequence holds the matched sequence, or null when none was hit.
console.log('stop_reason:', message.stop_reason);
console.log('stop_sequence:', message.stop_sequence);

console.log('input_tokens:', message.usage.input_tokens);
console.log('output_tokens:', message.usage.output_tokens);

// content is an array of blocks; narrow on type before reading text.
console.log(`content: ${message.content.length} block(s)`);
for (const block of message.content) {
  console.log('block type:', block.type);
  if (block.type === 'text') {
    console.log('block text:', block.text);
  }
}
