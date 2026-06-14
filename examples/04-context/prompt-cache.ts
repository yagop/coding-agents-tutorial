// bun run examples/04-context/prompt-cache.ts

import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();
const model = process.env.ANTHROPIC_DEFAULT_SONNET_MODEL ?? 'claude-sonnet-4-6';

// A byte-stable prefix past Sonnet's ~2048-token minimum: no timestamp or random value, or the cache silently misses.
const stable = 'You are a meticulous code reviewer. '.repeat(900);
const system: Anthropic.TextBlockParam[] = [{ type: 'text', text: stable, cache_control: { type: 'ephemeral' } }];
const messages: Anthropic.MessageParam[] = [{ role: 'user', content: 'Reply with the single word: ok.' }];

async function ask(label: string) {
  const message = await client.messages.create({ model, max_tokens: 16, system, messages });
  const { cache_creation_input_tokens, cache_read_input_tokens } = message.usage;
  console.log(`${label} created=${cache_creation_input_tokens ?? 0} read=${cache_read_input_tokens ?? 0}`);
}

// First request writes the cache; the second, identical request reads it back.
await ask('request 1');
await ask('request 2');
