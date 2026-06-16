// bun run examples/06-tool-chains/parallel-tools.ts

import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();
const model = process.env.ANTHROPIC_DEFAULT_SONNET_MODEL ?? 'claude-sonnet-4-6';

const tools: Anthropic.Tool[] = [
  {
    name: 'get_weather',
    description: 'Get the current weather for one city. Call once per city.',
    input_schema: {
      type: 'object',
      properties: { city: { type: 'string', description: 'City name' } },
      required: ['city'],
    },
  },
];

async function runTool(block: Anthropic.ToolUseBlock): Promise<Anthropic.ToolResultBlockParam> {
  const { city } = block.input as { city: string };
  await new Promise((resolve) => setTimeout(resolve, 100));
  return { type: 'tool_result', tool_use_id: block.id, content: `20C in ${city}` };
}

const messages: Anthropic.MessageParam[] = [
  { role: 'user', content: 'Compare the weather in Paris, Tokyo, and Cairo right now.' },
];

while (true) {
  const response = await client.messages.create({ model, max_tokens: 1024, tools, messages });
  messages.push({ role: 'assistant', content: response.content });

  if (response.stop_reason !== 'tool_use') {
    const text = response.content.find((b) => b.type === 'text');
    console.log(text?.text ?? '');
    break;
  }

  const calls = response.content.filter((b) => b.type === 'tool_use');
  console.log(`running ${calls.length} tool call(s) for this turn`);
  const results = await Promise.all(calls.map(runTool));
  messages.push({ role: 'user', content: results });
}
