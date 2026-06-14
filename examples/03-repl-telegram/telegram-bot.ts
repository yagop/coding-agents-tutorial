// bun run examples/03-repl-telegram/telegram-bot.ts

import Anthropic from '@anthropic-ai/sdk';

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  throw new Error('Set TELEGRAM_BOT_TOKEN in your .env (from BotFather).');
}

const base = `https://api.telegram.org/bot${token}`;
const client = new Anthropic();
const model = process.env.ANTHROPIC_DEFAULT_SONNET_MODEL ?? 'claude-sonnet-4-6';

type Update = {
  update_id: number;
  message?: {
    chat: { id: number };
    text?: string;
  };
};

type TgResult<T> = {
  ok: boolean;
  result?: T;
  description?: string;
};

async function tg<T>(method: string, body: object): Promise<TgResult<T>> {
  const response = await fetch(`${base}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return response.json() as Promise<TgResult<T>>;
}

async function* pollUpdates(): AsyncGenerator<Update> {
  let offset = 0;
  while (true) {
    const { result = [] } = await tg<Update[]>('getUpdates', { offset, timeout: 30 });
    for (const update of result) {
      offset = update.update_id + 1;
      yield update;
    }
  }
}

for await (const update of pollUpdates()) {
  const message = update.message;
  if (!message?.text) {
    continue;
  }
  const reply = await client.messages.create({
    model,
    max_tokens: 1024,
    messages: [{ role: 'user', content: message.text }],
  });
  const first = reply.content[0];
  const answer = first?.type === 'text' ? first.text : '...';
  await tg('sendMessage', { chat_id: message.chat.id, text: answer });
}
