// bun run examples/06-tool-chains/agent-loop.ts

import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();
const model = process.env.ANTHROPIC_DEFAULT_SONNET_MODEL ?? 'claude-sonnet-4-6';

const tools: Anthropic.Tool[] = [
  {
    name: 'get_weather',
    description: 'Get the current weather for a city. Call this when asked about weather.',
    input_schema: {
      type: 'object',
      properties: { city: { type: 'string', description: 'City name, e.g. Paris' } },
      required: ['city'],
    },
  },
];

function runTool(block: Anthropic.ToolUseBlock): string {
  const { city } = block.input as { city: string };
  return `It is 18C and clear in ${city}.`;
}

const messages: Anthropic.MessageParam[] = [
  { role: 'user', content: 'What is the weather in Paris, and is it warmer than Oslo?' },
];

while (true) {
  const response = await client.messages.create({ model, max_tokens: 1024, tools, messages });
  messages.push({ role: 'assistant', content: response.content });

  if (response.stop_reason !== 'tool_use') {
    const text = response.content.find((b) => b.type === 'text');
    console.log(text?.text ?? '');
    break;
  }

  const results: Anthropic.ToolResultBlockParam[] = [];
  for (const block of response.content) {
    if (block.type !== 'tool_use') continue;
    results.push({ type: 'tool_result', tool_use_id: block.id, content: runTool(block) });
  }
  messages.push({ role: 'user', content: results });
}
