// bun run examples/01-sdk-first-request/read-response.ts
//
// Make one client.messages.create call and thoroughly inspect the returned
// Anthropic.Message: its metadata (id, model, role, stop_reason, stop_sequence),
// token usage, and the content blocks it carries. The key idea is that
// message.content is an ARRAY of typed blocks - you narrow on block.type
// before touching type-specific fields like block.text.
//
// Prerequisites: ANTHROPIC_API_KEY exported in the environment (Bun auto-loads
// a .env file). Optionally set ANTHROPIC_BASE_URL to target a compatible
// provider; new Anthropic() reads both from process.env automatically.

import Anthropic from '@anthropic-ai/sdk';

// Reads ANTHROPIC_API_KEY (and ANTHROPIC_BASE_URL, if set) from the environment.
const client = new Anthropic();

// One non-streaming request. messages.create resolves to an Anthropic.Message.
// Annotating the variable makes the response shape explicit and gives us full
// editor/type-checker support on every field we read below.
const message: Anthropic.Message = await client.messages.create({
  model: 'claude-opus-4-8',
  max_tokens: 256,
  messages: [
    {
      role: 'user',
      content: 'In one sentence, what is the Anthropic Messages API?',
    },
  ],
});

// --- Response metadata -----------------------------------------------------
// Every Message carries identifying and accounting fields alongside its content.
console.log('id:           ', message.id); // e.g. "msg_01..."
console.log('model:        ', message.model); // the model that actually served the request
console.log('role:         ', message.role); // always "assistant" for a response

// stop_reason tells you WHY generation halted:
//   end_turn      - the model finished naturally
//   max_tokens    - hit the max_tokens cap (response may be truncated)
//   stop_sequence - a configured stop sequence was produced
//   tool_use      - the model wants to call a tool (covered in later chapters)
//   pause_turn / refusal - other terminal states
// It is null while a response is still streaming; here it is always set.
console.log('stop_reason:  ', message.stop_reason);

// stop_sequence is the matched sequence string when stop_reason is
// "stop_sequence", and null otherwise.
console.log('stop_sequence:', message.stop_sequence);

// --- Token usage -----------------------------------------------------------
// usage is how you reason about cost and context budget. input_tokens counts
// the prompt you sent; output_tokens counts what the model generated.
console.log('input_tokens: ', message.usage.input_tokens);
console.log('output_tokens:', message.usage.output_tokens);

// --- Content blocks --------------------------------------------------------
// message.content is Array<Anthropic.ContentBlock>, NOT a plain string. A
// single response can contain several blocks of different types (text,
// tool_use, thinking, ...). Always switch on block.type first.
console.log('\ncontent blocks:', message.content.length);

for (const block of message.content) {
  console.log('  block.type:', block.type);

  // Type narrowing in action: inside this branch TypeScript knows `block` is
  // an Anthropic.TextBlock, so block.text is a string we can safely read.
  // Without this guard, block.text would not exist on the union type.
  if (block.type === 'text') {
    console.log('  block.text:', block.text);
  }
}
