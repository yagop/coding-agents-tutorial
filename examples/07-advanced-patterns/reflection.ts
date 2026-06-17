// bun run examples/07-advanced-patterns/reflection.ts

import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();
const model = process.env.ANTHROPIC_DEFAULT_SONNET_MODEL ?? 'claude-sonnet-4-6';

const messages: Anthropic.MessageParam[] = [
  { role: 'user', content: 'Write a one-sentence tagline for a tool that turns shell commands into plain English.' },
];

const draft = await client.messages.create({ model, max_tokens: 512, messages });
const draftText = draft.content.find((b) => b.type === 'text');
console.log('draft:', draftText?.text ?? '');

messages.push({ role: 'assistant', content: draft.content });
messages.push({
  role: 'user',
  content: 'Critique your tagline for clarity and length, then write one improved version.',
});

const revised = await client.messages.create({ model, max_tokens: 512, messages });
const revisedText = revised.content.find((b) => b.type === 'text');
console.log('\nrevised:', revisedText?.text ?? '');
