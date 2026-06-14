// bun run examples/03-repl-telegram/telegram-stream.ts
import Anthropic from '@anthropic-ai/sdk';

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) throw new Error('Set TELEGRAM_BOT_TOKEN in your .env');
const base = `https://api.telegram.org/bot${token}`;
const client = new Anthropic();
const model = process.env.ANTHROPIC_DEFAULT_SONNET_MODEL ?? 'claude-sonnet-4-6';
type Update = { update_id: number; message?: { chat: { id: number }; text?: string } };
type TgResult<T> = { ok: boolean; result?: T; error_code: number; description: string; parameters?: { retry_after?: number } };
async function tg<T>(method: string, body: object): Promise<TgResult<T>> {
  const res = await fetch(`${base}/${method}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  return res.json() as Promise<TgResult<T>>;
}
async function edit(chat_id: number, message_id: number, text: string) {
  const res = await tg('editMessageText', { chat_id, message_id, text });
  if (res.ok || res.description?.includes('not modified') || res.error_code !== 429) return;
  await new Promise((r) => setTimeout(r, (res.parameters?.retry_after ?? 1) * 1000));
  await edit(chat_id, message_id, text);
}
let offset = 0;
for (;;) {
  const { result = [] } = await tg<Update[]>('getUpdates', { offset, timeout: 30 });
  for (const u of result) {
    offset = u.update_id + 1;
    const chat_id = u.message?.chat.id;
    const prompt = u.message?.text?.trim();
    if (chat_id === undefined || !prompt) continue;
    const sent = await tg<{ message_id: number }>('sendMessage', { chat_id, text: '...' });
    const message_id = sent.result!.message_id;
    const stream = client.messages.stream({ model, max_tokens: 1024, messages: [{ role: 'user', content: prompt }] });
    let text = '';
    let last = 0;
    // Editing per token trips Telegram's flood limit instantly - batch deltas, edit at most ~1/sec.
    stream.on('text', (delta) => {
      text += delta;
      if (Date.now() - last < 1000) return;
      last = Date.now();
      edit(chat_id, message_id, text);
    });
    await stream.finalMessage();
    await edit(chat_id, message_id, text);
  }
}
