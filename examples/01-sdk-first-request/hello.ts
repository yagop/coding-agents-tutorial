// bun run examples/01-sdk-first-request/hello.ts

import Anthropic from '@anthropic-ai/sdk';

// new Anthropic() reads your credentials and ANTHROPIC_BASE_URL from the environment - never hardcode them.
const client = new Anthropic();

const message = await client.messages.create({
  model: process.env.ANTHROPIC_DEFAULT_OPUS_MODEL ?? 'claude-opus-4-8',
  max_tokens: 1024,
  messages: [
    {
      role: 'user',
      content: 'Hello, Claude! In one sentence, what is the Anthropic Messages API?',
    },
  ],
});

// content is an array of blocks; narrow on block.type before reading block.text.
const first = message.content[0];
if (first?.type === 'text') {
  console.log(first.text);
}
