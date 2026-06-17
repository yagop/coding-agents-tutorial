// bun run examples/08-production/cost-tracker.ts

import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();
const model = process.env.ANTHROPIC_DEFAULT_SONNET_MODEL ?? 'claude-sonnet-4-6';

// Illustrative per-million-token prices; use your model's real numbers.
const inputPerMillion = 3;
const outputPerMillion = 15;

const totals = { input: 0, output: 0, cacheRead: 0, cost: 0 };

function record(usage: Anthropic.Usage): void {
  totals.input += usage.input_tokens;
  totals.output += usage.output_tokens;
  totals.cacheRead += usage.cache_read_input_tokens ?? 0;
  totals.cost += (usage.input_tokens / 1e6) * inputPerMillion;
  totals.cost += (usage.output_tokens / 1e6) * outputPerMillion;
}

for (const prompt of ['Define an LLM agent in one sentence.', 'Now in a single word.']) {
  const message = await client.messages.create({ model, max_tokens: 256, messages: [{ role: 'user', content: prompt }] });
  record(message.usage);
}

console.log(`input=${totals.input} output=${totals.output} cache_read=${totals.cacheRead}`);
console.log(`estimated cost: $${totals.cost.toFixed(5)}`);
