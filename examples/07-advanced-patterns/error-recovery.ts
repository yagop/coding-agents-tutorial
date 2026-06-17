// bun run examples/07-advanced-patterns/error-recovery.ts

import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();
const model = process.env.ANTHROPIC_DEFAULT_SONNET_MODEL ?? 'claude-sonnet-4-6';

const tools: Anthropic.Tool[] = [
  {
    name: 'read_file',
    description: 'Read a text file by name.',
    input_schema: {
      type: 'object',
      properties: { path: { type: 'string', description: 'File name' } },
      required: ['path'],
    },
  },
];

function readFile(path: string): string {
  if (path !== 'notes.txt') throw new Error(`no such file: ${path}`);
  return 'remember to water the plants';
}

async function createWithBackoff(messages: Anthropic.MessageParam[]): Promise<Anthropic.Message> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await client.messages.create({ model, max_tokens: 1024, tools, messages });
    } catch (error) {
      if (error instanceof Anthropic.RateLimitError && attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 2 ** attempt * 1000));
        continue;
      }
      throw error;
    }
  }
  throw new Error('unreachable');
}

const messages: Anthropic.MessageParam[] = [
  { role: 'user', content: 'Read notes.txt and config.txt, then tell me what each says or whether it is missing.' },
];

while (true) {
  const response = await createWithBackoff(messages);
  messages.push({ role: 'assistant', content: response.content });

  if (response.stop_reason !== 'tool_use') {
    const text = response.content.find((b) => b.type === 'text');
    console.log(text?.text ?? '');
    break;
  }

  const results: Anthropic.ToolResultBlockParam[] = [];
  for (const block of response.content) {
    if (block.type !== 'tool_use') continue;
    const { path } = block.input as { path: string };
    try {
      results.push({ type: 'tool_result', tool_use_id: block.id, content: readFile(path) });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      results.push({ type: 'tool_result', tool_use_id: block.id, content: reason, is_error: true });
    }
  }
  messages.push({ role: 'user', content: results });
}
