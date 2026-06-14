// bun run examples/05-tools/single-tool-loop.ts

import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();
const model = process.env.ANTHROPIC_DEFAULT_SONNET_MODEL ?? 'claude-sonnet-4-6';

const tools: Anthropic.Tool[] = [
  {
    name: 'get_weather',
    description: 'Call this when the user asks about current weather in a city.',
    input_schema: {
      type: 'object',
      properties: { city: { type: 'string', description: 'City name, e.g. Madrid' } },
      required: ['city'],
    },
  },
];

type WeatherInput = { city: string };

function getWeather(input: WeatherInput): string {
  return `It is 21C and sunny in ${input.city}.`;
}

const messages: Anthropic.MessageParam[] = [
  { role: 'user', content: 'What is the weather in Madrid right now?' },
];

const first = await client.messages.create({ model, max_tokens: 512, tools, messages });

if (first.stop_reason === 'tool_use') {
  // Append the assistant turn verbatim - the model needs to see its own tool_use block.
  messages.push({ role: 'assistant', content: first.content });

  const results: Anthropic.ToolResultBlockParam[] = [];
  for (const block of first.content) {
    if (block.type !== 'tool_use') continue;
    // block.input is already a parsed object from the SDK - never string-match the raw JSON.
    const answer = getWeather(block.input as WeatherInput);
    results.push({ type: 'tool_result', tool_use_id: block.id, content: answer });
  }

  messages.push({ role: 'user', content: results });

  const second = await client.messages.create({ model, max_tokens: 512, tools, messages });
  const text = second.content.find((b) => b.type === 'text');
  console.log(text?.text ?? '');
}
