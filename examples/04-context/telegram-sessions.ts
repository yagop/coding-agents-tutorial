// bun run examples/04-context/telegram-sessions.ts

import Anthropic from '@anthropic-ai/sdk';

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) throw new Error('Set TELEGRAM_BOT_TOKEN in your .env');
const base = `https://api.telegram.org/bot${token}`;
const client = new Anthropic();
type Update = { update_id: number; message?: { chat: { id: number }; text?: string } };
type Entry = [number, Anthropic.MessageParam[]];
async function tg<T>(method: string, body: object): Promise<{ result?: T }> {
  const res = await fetch(`${base}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json() as Promise<{ result?: T }>;
}
const file = `${import.meta.dir}/sessions.json`;
const saved: Entry[] = await Bun.file(file).exists() ? await Bun.file(file).json() : [];
const sessions = new Map<number, Anthropic.MessageParam[]>(saved);
const persist = () => Bun.write(file, JSON.stringify([...sessions], null, 2));

let offset = 0;
for (;;) {
  const { result = [] } = await tg<Update[]>('getUpdates', { offset, timeout: 30 });
  for (const u of result) {
    offset = u.update_id + 1;
    const chat = u.message?.chat.id;
    const prompt = u.message?.text?.trim();
    if (chat === undefined || !prompt) continue;
    const history = sessions.get(chat) ?? [];
    history.push({ role: 'user', content: prompt });
    const reply = await client.messages.create({ model: process.env.ANTHROPIC_DEFAULT_SONNET_MODEL ?? 'claude-sonnet-4-6', max_tokens: 1024, messages: history });
    history.push({ role: 'assistant', content: reply.content });
    sessions.set(chat, history);
    await persist();
    const first = reply.content[0];
    await tg('sendMessage', { chat_id: chat, text: first?.type === 'text' ? first.text : '...' });
  }
}
