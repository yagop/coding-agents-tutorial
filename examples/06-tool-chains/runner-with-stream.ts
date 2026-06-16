// bun run examples/06-tool-chains/runner-with-stream.ts

import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();
const model = process.env.ANTHROPIC_DEFAULT_SONNET_MODEL ?? 'claude-sonnet-4-6';

type Handler = (input: Anthropic.ToolUseBlock['input']) => string;

const tools: Anthropic.Tool[] = [
  {
    name: 'roll_die',
    description: 'Roll a die with the given number of sides and return the result.',
    input_schema: {
      type: 'object',
      properties: { sides: { type: 'number', description: 'Number of sides' } },
      required: ['sides'],
    },
  },
];

const handlers = new Map<string, Handler>([
  ['roll_die', (input) => {
    const { sides } = input as { sides: number };
    return String(1 + Math.floor(Math.random() * sides));
  }],
]);

const messages: Anthropic.MessageParam[] = [
  { role: 'user', content: 'Roll a 20-sided die, then tell me whether it beat a 10.' },
];

for (let i = 0; i < 10; i++) {
  const stream = client.messages.stream({ model, max_tokens: 1024, tools, messages });
  stream.on('text', (delta) => process.stdout.write(delta));
  const response = await stream.finalMessage();
  messages.push({ role: 'assistant', content: response.content });

  if (response.stop_reason !== 'tool_use') break;

  const results: Anthropic.ToolResultBlockParam[] = [];
  for (const block of response.content) {
    if (block.type !== 'tool_use') continue;
    const handler = handlers.get(block.name);
    const content = handler ? handler(block.input) : `unknown tool ${block.name}`;
    results.push({ type: 'tool_result', tool_use_id: block.id, content, is_error: !handler });
  }
  messages.push({ role: 'user', content: results });
}
process.stdout.write('\n');
