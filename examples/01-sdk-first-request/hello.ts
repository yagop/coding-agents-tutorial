// bun run examples/01-sdk-first-request/hello.ts
//
// Your very first call to the Anthropic Messages API. Minimal and well-commented.

// The default export of @anthropic-ai/sdk is the Anthropic client class.
import Anthropic from '@anthropic-ai/sdk';

// new Anthropic() reads ANTHROPIC_API_KEY from the environment (and
// ANTHROPIC_BASE_URL if set). Bun auto-loads a .env file at the repo root, so
// the key is already in process.env - never hardcode it here.
const client = new Anthropic();

// One request, one response. The Messages API is a single stateless endpoint
// (POST /v1/messages): you send model + max_tokens + messages, you get a reply.
// max_tokens is an upper bound on the response length, not a target.
const message = await client.messages.create({
  model: 'claude-opus-4-8',
  max_tokens: 1024,
  messages: [
    {
      role: 'user',
      content: 'Hello, Claude! In one sentence, what is the Anthropic Messages API?',
    },
  ],
});

// message.content is an array of content blocks. A plain text reply puts its
// text in a 'text' block - narrow on block.type before reading block.text so
// TypeScript knows .text exists on this block.
const first = message.content[0];
if (first?.type === 'text') {
  console.log(first.text);
}
