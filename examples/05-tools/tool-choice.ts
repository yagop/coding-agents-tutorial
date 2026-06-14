// bun run examples/05-tools/tool-choice.ts

import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();
const model = process.env.ANTHROPIC_DEFAULT_SONNET_MODEL ?? 'claude-sonnet-4-6';

const tools: Anthropic.Tool[] = [
  {
    name: 'get_weather',
    description: 'Call this when the user asks about weather in a city.',
    input_schema: {
      type: 'object',
      properties: { city: { type: 'string', description: 'City name, e.g. Madrid.' } },
      required: ['city'],
    },
  },
];

const prompt = 'What is the weather in Madrid?';

// Same prompt, four ways of steering the model toward (or away from) the tool.
const choices: { label: string; tool_choice: Anthropic.ToolChoice }[] = [
  { label: 'auto', tool_choice: { type: 'auto' } },
  { label: 'any', tool_choice: { type: 'any' } },
  { label: 'tool', tool_choice: { type: 'tool', name: 'get_weather' } },
  { label: 'auto + no parallel', tool_choice: { type: 'auto', disable_parallel_tool_use: true } },
];

for (const { label, tool_choice } of choices) {
  const message = await client.messages.create({
    model,
    max_tokens: 256,
    tools,
    tool_choice,
    messages: [{ role: 'user', content: prompt }],
  });

  const used = message.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use',
  );
  const chose = used ? used.name : 'none (answered in text)';
  console.log(`${label.padEnd(18)} stop_reason=${message.stop_reason} chose=${chose}`);
}
