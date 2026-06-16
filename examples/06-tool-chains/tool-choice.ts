// bun run examples/06-tool-chains/tool-choice.ts

import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();
const model = process.env.ANTHROPIC_DEFAULT_SONNET_MODEL ?? 'claude-sonnet-4-6';

const tools: Anthropic.Tool[] = [
  {
    name: 'get_time',
    description: 'Get the current time in a city.',
    input_schema: {
      type: 'object',
      properties: { city: { type: 'string', description: 'City name' } },
      required: ['city'],
    },
  },
];

const prompt = 'Just say hello - do not look anything up.';
const choices: { label: string; tool_choice: Anthropic.ToolChoice }[] = [
  { label: 'auto', tool_choice: { type: 'auto' } },
  { label: 'any', tool_choice: { type: 'any' } },
  { label: 'tool', tool_choice: { type: 'tool', name: 'get_time' } },
  { label: 'none', tool_choice: { type: 'none' } },
];

for (const { label, tool_choice } of choices) {
  const response = await client.messages.create({
    model,
    max_tokens: 256,
    tools,
    tool_choice,
    messages: [{ role: 'user', content: prompt }],
  });
  const calledTool = response.content.some((b) => b.type === 'tool_use');
  console.log(`${label.padEnd(5)} stop_reason=${response.stop_reason} called_tool=${calledTool}`);
}
