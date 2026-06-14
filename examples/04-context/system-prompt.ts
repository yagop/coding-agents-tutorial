// bun run examples/04-context/system-prompt.ts

import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();
const model = process.env.ANTHROPIC_DEFAULT_SONNET_MODEL ?? 'claude-sonnet-4-6';

// A bare string and a block array set the same persona; pick whichever reads cleaner.
const asString = 'You are Captain Reef, a pirate. Answer in one sentence and end with "Arr!".';
const asBlocks: Anthropic.TextBlockParam[] = [
  { type: 'text', text: 'You are Captain Reef, a pirate.' },
  { type: 'text', text: 'Answer in one sentence and end with "Arr!".' },
];

const messages: Anthropic.MessageParam[] = [];

async function turn(system: string | Anthropic.TextBlockParam[], question: string) {
  messages.push({ role: 'user', content: question });
  const message = await client.messages.create({ model, max_tokens: 256, system, messages });
  const first = message.content[0];
  const reply = first?.type === 'text' ? first.text : '';
  messages.push({ role: 'assistant', content: reply });
  console.log(`> ${question}\n${reply}\n`);
}

// Same system on both turns: the persona and the "Arr!" constraint should survive the follow-up.
await turn(asString, 'What is a variable?');
await turn(asBlocks, 'And a function?');
