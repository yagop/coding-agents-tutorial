// bun run examples/03-repl-telegram/telegram-bot.ts

import Anthropic from '@anthropic-ai/sdk';

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) throw new Error('Set TELEGRAM_BOT_TOKEN in your .env (from BotFather).');
const base = `https://api.telegram.org/bot${token}`;

type Update = { update_id: number; message?: { chat: { id: number }; text?: string } };
type TgResult<T> = { ok: boolean; result?: T; description?: string };

async function call<T>(method: string, body: object): Promise<TgResult<T>> {
  const res = await fetch(`${base}/${method}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  return res.json() as Promise<TgResult<T>>;
}

const client = new Anthropic();
let offset = 0; // last update_id + 1, so each update arrives exactly once

while (true) {
  const { result } = await call<Update[]>('getUpdates', { offset, timeout: 30 });
  for (const update of result ?? []) {
    offset = update.update_id + 1;
    const message = update.message;
    if (!message?.text) continue;
    const reply = await client.messages.create({
      model: process.env.ANTHROPIC_DEFAULT_SONNET_MODEL ?? 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: message.text }],
    });
    const first = reply.content[0];
    const answer = first?.type === 'text' ? first.text : '...';
    await call('sendMessage', { chat_id: message.chat.id, text: answer });
  }
}
