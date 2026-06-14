// bun run examples/04-context/telegram-sessions.ts

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

type Entry = [number, Anthropic.MessageParam[]];

// POST a JSON body to one Bot API method and return the parsed response.
async function tg<T>(method: string, body: object): Promise<{ result?: T }> {
  const response = await fetch(`${base}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return response.json() as Promise<{ result?: T }>;
}

// Long-poll getUpdates forever, yielding one update at a time.
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

const file = `${import.meta.dir}/sessions.json`;
const sessions = new Map<number, Anthropic.MessageParam[]>();
if (await Bun.file(file).exists()) {
  const saved = (await Bun.file(file).json()) as Entry[];
  for (const [chatId, history] of saved) {
    sessions.set(chatId, history);
  }
}

async function persist(): Promise<void> {
  const entries: Entry[] = [...sessions];
  await Bun.write(file, JSON.stringify(entries, null, 2));
}

for await (const update of pollUpdates()) {
  const chatId = update.message?.chat.id;
  const prompt = update.message?.text?.trim();
  if (chatId === undefined || !prompt) {
    continue;
  }

  const history = sessions.get(chatId) ?? [];
  history.push({ role: 'user', content: prompt });

  const reply = await client.messages.create({
    model,
    max_tokens: 1024,
    messages: history,
  });
  history.push({ role: 'assistant', content: reply.content });

  sessions.set(chatId, history);
  await persist();

  const first = reply.content[0];
  const answer = first?.type === 'text' ? first.text : '...';
  await tg('sendMessage', { chat_id: chatId, text: answer });
}
