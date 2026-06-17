// bun run examples/07-advanced-patterns/extended-thinking.ts

import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();
const model = process.env.ANTHROPIC_DEFAULT_SONNET_MODEL ?? 'claude-sonnet-4-6';

const response = await client.messages.create({
  model,
  max_tokens: 2048,
  thinking: { type: 'adaptive' },
  messages: [
    { role: 'user', content: 'A bat and a ball cost 1.10 in total. The bat costs 1.00 more than the ball. How much is the ball?' },
  ],
});

console.log('stop_reason:', response.stop_reason);

for (const block of response.content) {
  if (block.type === 'thinking') {
    console.log('\n[thinking]\n' + block.thinking);
  }
  if (block.type === 'text') {
    console.log('\n[answer]\n' + block.text);
  }
}
