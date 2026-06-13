// bun run examples/01-sdk-first-request/pick-a-model.ts

import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

const models: Anthropic.Model[] = [
  process.env.ANTHROPIC_DEFAULT_OPUS_MODEL ?? 'claude-opus-4-8',
  process.env.ANTHROPIC_DEFAULT_SONNET_MODEL ?? 'claude-sonnet-4-6',
  process.env.ANTHROPIC_DEFAULT_HAIKU_MODEL ?? 'claude-haiku-4-5',
];
const prompt = 'In one sentence, what is a coding agent?';

async function ask(model: Anthropic.Model, max_tokens: number) {
  const message = await client.messages.create({ model, max_tokens, messages: [{ role: 'user', content: prompt }] });
  // content is a block array; narrow on type === 'text' before reading the text.
  const first = message.content[0];
  const text = first?.type === 'text' ? first.text : '';
  const { input_tokens, output_tokens } = message.usage;
  console.log(`  cap=${max_tokens} in=${input_tokens} out=${output_tokens} stop=${message.stop_reason} :: ${text}`);
}

for (const model of models) {
  console.log(`\n=== ${model} ===`);
  // Same prompt, two caps: a roomy cap lets the model finish (stop_reason 'end_turn'),
  // a tiny cap truncates the same reply (stop_reason 'max_tokens') - an upper bound, not a target.
  await ask(model, 256);
  await ask(model, 16);
}
