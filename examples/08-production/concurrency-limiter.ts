// bun run examples/08-production/concurrency-limiter.ts

import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();
const model = process.env.ANTHROPIC_DEFAULT_SONNET_MODEL ?? 'claude-sonnet-4-6';

const words = ['cat', 'dog', 'bird', 'fish', 'frog'];
const maxConcurrent = 2;
let remaining = Infinity;

async function ask(word: string): Promise<void> {
  const { data, response } = await client.messages
    .create({ model, max_tokens: 64, messages: [{ role: 'user', content: `One fun fact about a ${word}.` }] })
    .withResponse();
  const header = response.headers.get('anthropic-ratelimit-requests-remaining');
  if (header !== null) remaining = Number(header);
  const text = data.content.find((b) => b.type === 'text');
  console.log(`${word}: ${text?.text?.slice(0, 60) ?? ''}`);
}

const queue = [...words];

async function worker(): Promise<void> {
  let word = queue.shift();
  while (word !== undefined) {
    await ask(word);
    word = queue.shift();
  }
}

await Promise.all(Array.from({ length: maxConcurrent }, worker));
console.log(`requests remaining per headers: ${remaining}`);
