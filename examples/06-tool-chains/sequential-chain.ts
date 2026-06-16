// bun run examples/06-tool-chains/sequential-chain.ts

import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();
const model = process.env.ANTHROPIC_DEFAULT_SONNET_MODEL ?? 'claude-sonnet-4-6';

const tools: Anthropic.Tool[] = [
  {
    name: 'find_user',
    description: 'Look up a user id by name. Call this first when you only have a name.',
    input_schema: {
      type: 'object',
      properties: { name: { type: 'string', description: 'Full name' } },
      required: ['name'],
    },
  },
  {
    name: 'get_balance',
    description: 'Get the account balance for a user id. Needs the id from find_user.',
    input_schema: {
      type: 'object',
      properties: { userId: { type: 'string', description: 'User id like u_42' } },
      required: ['userId'],
    },
  },
];

function runTool(block: Anthropic.ToolUseBlock): string {
  if (block.name === 'find_user') {
    const { name } = block.input as { name: string };
    return name.includes('Ada') ? 'u_42' : 'u_unknown';
  }
  const { userId } = block.input as { userId: string };
  return userId === 'u_42' ? '1200.50 USD' : 'no such account';
}

const messages: Anthropic.MessageParam[] = [
  { role: 'user', content: "What is Ada Lovelace's account balance?" },
];

while (true) {
  const response = await client.messages.create({ model, max_tokens: 1024, tools, messages });
  messages.push({ role: 'assistant', content: response.content });

  for (const block of response.content) {
    if (block.type === 'tool_use') console.log(`-> ${block.name}(${JSON.stringify(block.input)})`);
  }

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
