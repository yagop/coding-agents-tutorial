// bun run examples/03-repl-telegram/repl-stream.ts

import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();
const model = process.env.ANTHROPIC_DEFAULT_SONNET_MODEL ?? 'claude-sonnet-4-6';

const messages: Anthropic.MessageParam[] = [];

process.stdout.write('you: ');
for await (const line of console) {
  const input = line.trim();
  if (input) {
    messages.push({ role: 'user', content: input });

    process.stdout.write('claude: ');
    const stream = client.messages.stream({ model, max_tokens: 1024, messages });
    // 'text' fires once per chunk; write each delta to paint the reply live.
    stream.on('text', (delta) => process.stdout.write(delta));
    const final = await stream.finalMessage();
    process.stdout.write('\n');

    const first = final.content[0];
    const reply = first?.type === 'text' ? first.text : '';
    messages.push({ role: 'assistant', content: reply });
  }
  process.stdout.write('you: ');
}
