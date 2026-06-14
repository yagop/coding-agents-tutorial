// bun run examples/05-tools/dispatch-handlers.ts

import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();
const model = process.env.ANTHROPIC_DEFAULT_SONNET_MODEL ?? 'claude-sonnet-4-6';

const tools: Anthropic.Tool[] = [
  {
    name: 'get_weather',
    description: 'Call this when the user asks about current weather in a city.',
    input_schema: {
      type: 'object',
      properties: { city: { type: 'string', description: 'City name, e.g. Madrid.' } },
      required: ['city'],
    },
  },
  {
    name: 'add',
    description: 'Call this to add two numbers together.',
    input_schema: {
      type: 'object',
      properties: {
        a: { type: 'number', description: 'First addend.' },
        b: { type: 'number', description: 'Second addend.' },
      },
      required: ['a', 'b'],
    },
  },
];

// One typed shape per tool input. The SDK types block.input loosely, so each
// handler casts it to the matching shape before reading fields.
type WeatherInput = { city: string };
type AddInput = { a: number; b: number };

// A handler takes the already-parsed block.input object and returns tool_result content.
type Handler = (input: Anthropic.ToolUseBlock['input']) => string;

// One entry per tool name; this map is the only thing that grows as you add tools.
const handlers = new Map<string, Handler>([
  ['get_weather', (input) => `It is 21C and sunny in ${(input as WeatherInput).city}.`],
  ['add', (input) => {
    const { a, b } = input as AddInput;
    return String(a + b);
  }],
]);

const messages: Anthropic.MessageParam[] = [
  { role: 'user', content: 'What is the weather in Madrid, and what is 19 plus 23?' },
];

const message = await client.messages.create({ model, max_tokens: 512, tools, messages });

if (message.stop_reason === 'tool_use') {
  messages.push({ role: 'assistant', content: message.content });

  const results: Anthropic.ToolResultBlockParam[] = [];
  for (const block of message.content) {
    if (block.type !== 'tool_use') continue;
    const handler = handlers.get(block.name);
    // Every tool_use needs a matching tool_result, so report a missing handler as an error.
    if (!handler) {
      const content = `No handler registered for tool ${block.name}.`;
      results.push({ type: 'tool_result', tool_use_id: block.id, content, is_error: true });
      continue;
    }
    // block.input is already a parsed object from the SDK - never JSON.parse it.
    const answer = handler(block.input);
    results.push({ type: 'tool_result', tool_use_id: block.id, content: answer });
  }

  messages.push({ role: 'user', content: results });
  const final = await client.messages.create({ model, max_tokens: 512, tools, messages });

  const text = final.content.find((block) => block.type === 'text');
  console.log('claude:', text?.text ?? '');
}
