// Inspect the whole Anthropic.Message: id, model, role, stop_reason,
// stop_sequence, usage, and every content block.
// Run: bun run examples/01-sdk-first-request/read-response.ts

import Anthropic from '@anthropic-ai/sdk';

// new Anthropic() reads ANTHROPIC_API_KEY from the environment. Bun auto-loads a
// .env file at the repo root, so the key is already in process.env - never
// hardcode it here.
const client = new Anthropic();

// Typing the variable as Anthropic.Message makes the full response shape visible
// to the editor: id, model, role, content, stop_reason, stop_sequence, usage.
const message: Anthropic.Message = await client.messages.create({
  model: 'claude-sonnet-4-6',
  max_tokens: 256,
  system: 'You are a concise assistant. Answer in one short paragraph.',
  messages: [{ role: 'user', content: 'In one sentence, what is a coding agent?' }],
});

// 1) Top-level metadata about the response.
//    - id: a unique identifier for this message (format may change over time).
//    - model: the exact model that produced the reply.
//    - role: always 'assistant' for a response.
console.log('id:', message.id);
console.log('model:', message.model);
console.log('role:', message.role);

// 2) stop_reason tells you WHY the model stopped. For a complete answer it is
//    'end_turn'; 'max_tokens' means the reply was cut off by your max_tokens cap;
//    'stop_sequence' means a custom stop sequence was hit. stop_sequence holds the
//    matched sequence in that case, otherwise it is null.
console.log('stop_reason:', message.stop_reason);
console.log('stop_sequence:', message.stop_sequence);

// 3) usage reports billed tokens for this single request.
console.log('input_tokens:', message.usage.input_tokens);
console.log('output_tokens:', message.usage.output_tokens);

// 4) content is Array<ContentBlock>, so a single response can hold more than one
//    block. The type guard below does double duty: filter() uses it to keep only
//    text blocks at runtime, and the `block is Anthropic.TextBlock` predicate
//    narrows the element type so block.text is available and typed as a string.
//    join() then stitches the text blocks back into one string.
console.log(`content: ${message.content.length} block(s)`);
const text = message.content
  .filter((block): block is Anthropic.TextBlock => block.type === 'text')
  .map((block) => block.text)
  .join('\n');
console.log('text:', text);
