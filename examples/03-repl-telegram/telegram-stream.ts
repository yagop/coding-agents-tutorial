// bun run examples/03-repl-telegram/telegram-stream.ts

import Anthropic from '@anthropic-ai/sdk';

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  throw new Error('Set TELEGRAM_BOT_TOKEN in your .env');
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
  error_code: number;
  description: string;
  parameters?: { retry_after?: number };
};

// POST a JSON body to one Bot API method and return the parsed response.
async function tg<T>(method: string, body: object): Promise<TgResult<T>> {
  const response = await fetch(`${base}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return response.json() as Promise<TgResult<T>>;
}

// Edit a message in place, retrying once Telegram lifts a 429 flood limit.
async function edit(chat_id: number, message_id: number, text: string): Promise<void> {
  const result = await tg('editMessageText', { chat_id, message_id, text });
  if (result.ok || result.description?.includes('not modified') || result.error_code !== 429) {
    return;
  }
  const retryAfter = result.parameters?.retry_after ?? 1;
  await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
  await edit(chat_id, message_id, text);
}

let offset = 0;
for (;;) {
  const { result = [] } = await tg<Update[]>('getUpdates', { offset, timeout: 30 });
  for (const update of result) {
    offset = update.update_id + 1;
    const chat_id = update.message?.chat.id;
    const prompt = update.message?.text?.trim();
    if (chat_id === undefined || !prompt) {
      continue;
    }

    const placeholder = await tg<{ message_id: number }>('sendMessage', {
      chat_id,
      text: '...',
    });
    const message_id = placeholder.result!.message_id;

    const stream = client.messages.stream({
      model,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    let text = '';
    let lastEdit = 0;
    // Editing on every token trips the flood limit; batch deltas and edit at most ~1/sec.
    stream.on('text', (delta) => {
      text += delta;
      if (Date.now() - lastEdit < 1000) {
        return;
      }
      lastEdit = Date.now();
      edit(chat_id, message_id, text);
    });

    await stream.finalMessage();
    await edit(chat_id, message_id, text);
  }
}
