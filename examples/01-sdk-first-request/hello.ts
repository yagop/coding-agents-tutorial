// bun run examples/01-sdk-first-request/hello.ts

// The default export of `@anthropic-ai/sdk` is the Anthropic client class.
// Types live on the namespace (Anthropic.Message, Anthropic.ContentBlock, ...).
import Anthropic from '@anthropic-ai/sdk'

// `new Anthropic()` reads its credentials from the environment: it picks up
// ANTHROPIC_API_KEY (and ANTHROPIC_BASE_URL, if set) automatically. Bun
// auto-loads a `.env` file, so exporting the key or putting it in `.env` both
// work. Never hardcode the key in source.
const client = new Anthropic()

// The Messages API is a single endpoint (POST /v1/messages). Each call is
// stateless: you send the model, a max_tokens cap, and the conversation so far,
// and you get one response back. `messages.create` (non-streaming) resolves to
// an Anthropic.Message.
const message = await client.messages.create({
  model: 'claude-opus-4-8',
  // max_tokens is an upper bound on the response length, not a target - the
  // model stops when it is done, or when it hits this cap.
  max_tokens: 1024,
  messages: [
    {
      role: 'user',
      content: 'Hello, Claude! In one sentence, what is the Anthropic Messages API?',
    },
  ],
})

// `message.content` is an array of content blocks (a discriminated union).
// Narrow on `block.type === 'text'` before reading `block.text` - that check is
// what lets TypeScript know the block has a `.text` string.
const firstBlock = message.content[0]
if (firstBlock?.type === 'text') {
  console.log(firstBlock.text)
}

// `stop_reason` tells you why generation ended (here, usually 'end_turn'; it
// would be 'max_tokens' if the cap above were hit). `usage` reports how many
// tokens the request and response cost.
console.log('---')
console.log('stop_reason:', message.stop_reason)
console.log('input tokens:', message.usage.input_tokens)
console.log('output tokens:', message.usage.output_tokens)
