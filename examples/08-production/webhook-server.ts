// bun run examples/08-production/webhook-server.ts

import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();
const model = process.env.ANTHROPIC_DEFAULT_SONNET_MODEL ?? 'claude-sonnet-4-6';
const secret = process.env.TELEGRAM_WEBHOOK_SECRET ?? 'dev-secret';

type Update = { message?: { chat: { id: number }; text?: string } };

const server = Bun.serve({
  port: 3000,
  async fetch(req) {
    if (req.method !== 'POST') return new Response('ok');
    if (req.headers.get('x-telegram-bot-api-secret-token') !== secret) {
      return new Response('forbidden', { status: 403 });
    }
    const update = (await req.json()) as Update;
    const text = update.message?.text;
    if (text) {
      const reply = await client.messages.create({ model, max_tokens: 256, messages: [{ role: 'user', content: text }] });
      const block = reply.content.find((b) => b.type === 'text');
      console.log(`chat ${update.message?.chat.id}: ${block?.text ?? ''}`);
    }
    return new Response('ok');
  },
});

console.log(`listening on :${server.port}`);
