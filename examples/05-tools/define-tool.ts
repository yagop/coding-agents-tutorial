// bun run examples/05-tools/define-tool.ts

import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();
const model = process.env.ANTHROPIC_DEFAULT_SONNET_MODEL ?? 'claude-sonnet-4-6';

// name, "call this when..." description, and a JSON Schema input_schema are the whole contract.
const getWeather: Anthropic.Tool = {
  name: 'get_weather',
  description: 'Call this when the user asks about current weather in a specific place.',
  input_schema: {
    type: 'object',
    properties: {
      location: { type: 'string', description: 'City and region, e.g. "Paris, France".' },
      unit: { type: 'string', enum: ['celsius', 'fahrenheit'], description: 'Temperature unit.' },
    },
    required: ['location'],
  },
};

// The SDK types block.input loosely, so cast it to the shape this tool produces.
type WeatherInput = { location: string; unit?: 'celsius' | 'fahrenheit' };

const message = await client.messages.create({
  model,
  max_tokens: 512,
  tools: [getWeather],
  messages: [{ role: 'user', content: 'What is the weather like in Tokyo right now?' }],
});

console.log('stop_reason:', message.stop_reason);

// Narrow on type to pick the tool_use block out of the content array.
const toolUse = message.content.find(
  (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use',
);

if (toolUse) {
  // block.input arrives already parsed from the SDK - cast it, never JSON.parse it.
  const input = toolUse.input as WeatherInput;
  console.log('id:', toolUse.id);
  console.log('name:', toolUse.name);
  console.log('input:', input);
}
