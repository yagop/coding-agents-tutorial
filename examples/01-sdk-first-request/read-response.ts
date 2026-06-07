// bun run examples/01-sdk-first-request/read-response.ts
//
// Make one client.messages.create call, then thoroughly inspect the returned
// Anthropic.Message: top-level fields (id, model, role, stop_reason,
// stop_sequence), token usage, and the content blocks. The content array is a
// discriminated union (Anthropic.ContentBlock) keyed on `type`, so reading the
// text off a block requires narrowing with `block.type === 'text'` first.

import Anthropic from '@anthropic-ai/sdk'

// new Anthropic() reads ANTHROPIC_API_KEY (and ANTHROPIC_BASE_URL, if set) from
// the environment. Bun auto-loads .env, so no dotenv import is needed.
const client = new Anthropic()

// The non-streaming overload of messages.create resolves to an Anthropic.Message.
// Typing the variable explicitly makes the response shape visible at the call site.
const message: Anthropic.Message = await client.messages.create({
  model: 'claude-opus-4-8',
  max_tokens: 1024,
  messages: [
    {
      role: 'user',
      content: 'In one sentence, what is the Anthropic Messages API?',
    },
  ],
})

// --- Top-level response metadata -------------------------------------------
// Every Message carries an id, the model that produced it, and role: 'assistant'.
console.log('id:           ', message.id)
console.log('model:        ', message.model)
console.log('role:         ', message.role)

// stop_reason is why generation stopped: 'end_turn' | 'max_tokens' |
// 'stop_sequence' | 'tool_use' | 'pause_turn' | 'refusal', or null while the
// message is still being produced (never null here, since we awaited it).
console.log('stop_reason:  ', message.stop_reason)

// stop_sequence is the matched custom stop string, or null when stop_reason is
// anything other than 'stop_sequence'.
console.log('stop_sequence:', message.stop_sequence)

// --- Token usage ------------------------------------------------------------
// input_tokens / output_tokens drive billing. (usage also exposes
// cache_creation_input_tokens / cache_read_input_tokens, which stay null here.)
console.log('input_tokens: ', message.usage.input_tokens)
console.log('output_tokens:', message.usage.output_tokens)

// --- Content blocks ---------------------------------------------------------
// message.content is Array<Anthropic.ContentBlock> - a discriminated union.
// Log each block's `type`, and only read block.text after narrowing to the
// 'text' variant. TypeScript rejects block.text before this check, because not
// every ContentBlock has a `text` field.
console.log('content blocks:', message.content.length)
for (const [index, block] of message.content.entries()) {
  console.log(`  [${index}] type:`, block.type)
  if (block.type === 'text') {
    // Inside this branch, `block` is narrowed to Anthropic.TextBlock,
    // so block.text is a string.
    const textBlock: Anthropic.TextBlock = block
    console.log(`  [${index}] text:`, textBlock.text)
  }
}
