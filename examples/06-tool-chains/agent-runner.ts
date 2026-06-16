// bun run examples/06-tool-chains/agent-runner.ts

import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();
const model = process.env.ANTHROPIC_DEFAULT_SONNET_MODEL ?? 'claude-sonnet-4-6';

type Handler = (input: Anthropic.ToolUseBlock['input']) => Promise<string> | string;

async function runAgent(
  messages: Anthropic.MessageParam[],
  tools: Anthropic.Tool[],
  handlers: Map<string, Handler>,
  maxIterations = 10,
): Promise<string> {
  for (let i = 0; i < maxIterations; i++) {
    const response = await client.messages.create({ model, max_tokens: 1024, tools, messages });
    messages.push({ role: 'assistant', content: response.content });

    if (response.stop_reason !== 'tool_use') {
      const text = response.content.find((b) => b.type === 'text');
      return text?.text ?? '';
    }

    const calls = response.content.filter((b) => b.type === 'tool_use');
    const results = await Promise.all(
      calls.map(async (block): Promise<Anthropic.ToolResultBlockParam> => {
        const handler = handlers.get(block.name);
        if (!handler) {
          return { type: 'tool_result', tool_use_id: block.id, content: `unknown tool ${block.name}`, is_error: true };
        }
        try {
          return { type: 'tool_result', tool_use_id: block.id, content: await handler(block.input) };
        } catch (error) {
          const reason = error instanceof Error ? error.message : String(error);
          return { type: 'tool_result', tool_use_id: block.id, content: reason, is_error: true };
        }
      }),
    );
    messages.push({ role: 'user', content: results });
  }
  return `stopped after ${maxIterations} iterations`;
}

const tools: Anthropic.Tool[] = [
  {
    name: 'add',
    description: 'Add two numbers and return the sum.',
    input_schema: {
      type: 'object',
      properties: { a: { type: 'number', description: 'First addend' }, b: { type: 'number', description: 'Second addend' } },
      required: ['a', 'b'],
    },
  },
];

const handlers = new Map<string, Handler>([
  ['add', (input) => {
    const { a, b } = input as { a: number; b: number };
    return String(a + b);
  }],
]);

const answer = await runAgent(
  [{ role: 'user', content: 'What is 19 + 23, and then add 100 to that result?' }],
  tools,
  handlers,
);
console.log(answer);
