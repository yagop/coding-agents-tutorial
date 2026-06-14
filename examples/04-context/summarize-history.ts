// bun run examples/04-context/summarize-history.ts

import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();
const model = process.env.ANTHROPIC_DEFAULT_SONNET_MODEL ?? 'claude-sonnet-4-6';
// A pretend-long history that in a real bot grows turn by turn.
const messages: Anthropic.MessageParam[] = [
  { role: 'user', content: 'I am Ada, planning a five-night Lisbon trip in early May on a tight budget.' },
  { role: 'assistant', content: 'Got it: Ada, Lisbon, early May, five nights, budget-conscious.' },
  { role: 'user', content: 'Vegetarian, and I want to be near the tram lines.' },
  { role: 'assistant', content: 'Noted: vegetarian, lodging close to the historic tram routes.' },
];
// Replace the old turns with one user/assistant pair so roles still alternate.
async function summarize(history: Anthropic.MessageParam[]): Promise<Anthropic.MessageParam[]> {
  const transcript = history.map((m) => `${m.role}: ${m.content}`).join('\n');
  const summary = await client.messages.create({
    model,
    max_tokens: 512,
    messages: [{ role: 'user', content: `Summarize this conversation as durable memory:\n\n${transcript}` }],
  });
  const first = summary.content[0];
  return [
    { role: 'user', content: 'Here is a summary of our earlier conversation.' },
    { role: 'assistant', content: first?.type === 'text' ? first.text : '' },
  ];
}
const threshold = 30;
const { input_tokens } = await client.messages.countTokens({ model, messages });
console.log(`history is ${input_tokens} tokens; threshold ${threshold}`);
if (input_tokens > threshold) {
  const compacted = await summarize(messages);
  console.log(`compacted ${messages.length} turns into ${compacted.length}:`);
  for (const m of compacted) console.log(`  ${m.role}: ${m.content}`);
}
