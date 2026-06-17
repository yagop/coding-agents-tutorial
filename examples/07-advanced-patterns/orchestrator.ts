// bun run examples/07-advanced-patterns/orchestrator.ts

import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();
const model = process.env.ANTHROPIC_DEFAULT_SONNET_MODEL ?? 'claude-sonnet-4-6';

async function summarize(text: string): Promise<string> {
  const response = await client.messages.create({
    model,
    max_tokens: 256,
    system: 'You summarize text in one short sentence.',
    messages: [{ role: 'user', content: text }],
  });
  const block = response.content.find((b) => b.type === 'text');
  return block?.text ?? '';
}

const tools: Anthropic.Tool[] = [
  {
    name: 'summarize_text',
    description: 'Summarize a block of text into one sentence.',
    input_schema: {
      type: 'object',
      properties: { text: { type: 'string', description: 'Text to summarize' } },
      required: ['text'],
    },
  },
];

const messages: Anthropic.MessageParam[] = [
  { role: 'user', content: 'Summarize this for me: "The agent loop calls the model, runs any tools it asks for, and repeats until the model is done."' },
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
    const { text } = block.input as { text: string };
    results.push({ type: 'tool_result', tool_use_id: block.id, content: await summarize(text) });
  }
  messages.push({ role: 'user', content: results });
}
