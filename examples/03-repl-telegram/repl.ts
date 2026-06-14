// bun run examples/03-repl-telegram/repl.ts

import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();
const model = process.env.ANTHROPIC_DEFAULT_SONNET_MODEL ?? 'claude-sonnet-4-6';

// One messages array, reused across turns, is this session's whole memory.
const messages: Anthropic.MessageParam[] = [];

process.stdout.write('you: ');
// The loop ends at EOF (Ctrl-D, or end of piped input).
for await (const line of console) {
  const text = line.trim();
  if (!text) {
    process.stdout.write('you: ');
    continue;
  }

  messages.push({ role: 'user', content: text });
  const message = await client.messages.create({ model, max_tokens: 1024, messages });

  // content is a block array; narrow on type === 'text' before reading the reply.
  const first = message.content[0];
  const reply = first?.type === 'text' ? first.text : '';
  console.log(`claude: ${reply}`);

  messages.push({ role: 'assistant', content: reply });
  process.stdout.write('you: ');
}
