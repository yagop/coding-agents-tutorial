// bun run examples/04-context/token-counter.ts

import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();
const model = process.env.ANTHROPIC_DEFAULT_SONNET_MODEL ?? 'claude-sonnet-4-6';

// retrieve confirms the model and gives you a label to log; it is not a budget source.
const info = await client.models.retrieve(model);

// A deliberately small threshold so these short demo turns actually trip the trim.
const THRESHOLD = 40;
const system = 'You are a terse assistant. Reply in one short sentence.';
console.log(`counting against ${info.display_name}, trimming above ${THRESHOLD} tokens`);

const messages: Anthropic.MessageParam[] = [];
for (const turn of ['Name a planet.', 'Another?', 'And one more?', 'Last one?']) {
  messages.push({ role: 'user', content: turn });

  // Count the exact payload create will send, then roll the window under threshold.
  let { input_tokens } = await client.messages.countTokens({ model, system, messages });
  while (input_tokens > THRESHOLD && messages.length > 2) {
    messages.splice(0, 2);
    ({ input_tokens } = await client.messages.countTokens({ model, system, messages }));
  }
  console.log(`tokens=${input_tokens} window=${messages.length} msgs`);

  const reply = await client.messages.create({ model, max_tokens: 64, system, messages });
  const first = reply.content[0];
  messages.push({ role: 'assistant', content: first?.type === 'text' ? first.text : '' });
}
