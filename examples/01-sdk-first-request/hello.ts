// bun run examples/01-sdk-first-request/hello.ts

// The default export of @anthropic-ai/sdk is the Anthropic client class.
// Types live on the same namespace (Anthropic.Message, Anthropic.ContentBlock, ...).
import Anthropic from '@anthropic-ai/sdk'

// new Anthropic() reads ANTHROPIC_API_KEY (and, if set, ANTHROPIC_BASE_URL)
// from the environment. Bun auto-loads a .env file, so no dotenv import is
// needed. Never hardcode the key here.
const client = new Anthropic()

// One stateless POST to /v1/messages. The three required fields are model,
// max_tokens (an upper bound on the response, not a target length), and the
// messages array. messages.create returns a typed Anthropic.Message.
const message = await client.messages.create({
  model: 'claude-opus-4-8',
  max_tokens: 1024,
  messages: [
    {
      role: 'user',
      content: 'Hello, Claude! In one sentence, what is the Anthropic Messages API?',
    },
  ],
})

// message.content is an array of content blocks (a discriminated union).
// Narrow on block.type === 'text' before reading block.text, or TypeScript
// won't let you touch the text field.
const firstBlock = message.content[0]
if (firstBlock?.type === 'text') {
  console.log(firstBlock.text)
}
