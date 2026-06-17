// bun run examples/07-advanced-patterns/autonomous-loop.ts

import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();
const model = process.env.ANTHROPIC_DEFAULT_SONNET_MODEL ?? 'claude-sonnet-4-6';

const tools: Anthropic.Tool[] = [
  {
    name: 'word_length',
    description: 'Return the number of letters in a single word.',
    input_schema: {
      type: 'object',
      properties: { word: { type: 'string', description: 'One word' } },
      required: ['word'],
    },
  },
];

const messages: Anthropic.MessageParam[] = [
  { role: 'user', content: 'Use the tool to compare the lengths of "agent" and "orchestration", then say which is longer.' },
];

const maxSteps = 6;
let totalTokens = 0;

for (let step = 0; step < maxSteps; step++) {
  const response = await client.messages.create({ model, max_tokens: 1024, tools, messages });
  totalTokens += response.usage.input_tokens + response.usage.output_tokens;
  messages.push({ role: 'assistant', content: response.content });
  console.log(`step ${step + 1}: stop_reason=${response.stop_reason} total_tokens=${totalTokens}`);

  if (response.stop_reason !== 'tool_use') {
    const text = response.content.find((b) => b.type === 'text');
    console.log(text?.text ?? '');
    break;
  }

  const results: Anthropic.ToolResultBlockParam[] = [];
  for (const block of response.content) {
    if (block.type !== 'tool_use') continue;
    const { word } = block.input as { word: string };
    results.push({ type: 'tool_result', tool_use_id: block.id, content: String(word.length) });
  }
  messages.push({ role: 'user', content: results });
}
