// bun run examples/04-context/multi-turn.ts

import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();
const model = process.env.ANTHROPIC_DEFAULT_SONNET_MODEL ?? 'claude-sonnet-4-6';

// The API is stateless: this array is the entire memory you resend every call.
const messages: Anthropic.MessageParam[] = [];

const turns = [
  'My favorite color is teal. Remember it.',
  'What is 12 times 11?',
  'What was my favorite color again?',
];

for (const text of turns) {
  messages.push({ role: 'user', content: text });
  const message = await client.messages.create({ model, max_tokens: 256, messages });

  // Push the response.content block array straight back as the assistant turn.
  messages.push({ role: 'assistant', content: message.content });

  const first = message.content[0];
  const reply = first?.type === 'text' ? first.text : '';
  console.log(`turn ${messages.length / 2} | you: ${text}`);
  console.log(`claude: ${reply}\n`);
}

console.log(`history holds ${messages.length} messages across ${messages.length / 2} turns`);
