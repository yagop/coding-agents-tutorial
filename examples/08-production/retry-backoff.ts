// bun run examples/08-production/retry-backoff.ts

import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();
const model = process.env.ANTHROPIC_DEFAULT_SONNET_MODEL ?? 'claude-sonnet-4-6';

async function createOnce(content: string): Promise<Anthropic.Message> {
  return client.messages.create(
    { model, max_tokens: 256, messages: [{ role: 'user', content }] },
    { maxRetries: 0 },
  );
}

for (let attempt = 0; attempt < 4; attempt++) {
  try {
    const message = await createOnce('Name one benefit of idempotent tools.');
    const text = message.content.find((b) => b.type === 'text');
    console.log(text?.text ?? '');
    break;
  } catch (error) {
    if (!(error instanceof Anthropic.RateLimitError) || attempt === 3) throw error;
    const retryAfter = error.headers?.get('retry-after');
    const wait = retryAfter ? Number(retryAfter) : 2 ** attempt;
    console.log(`rate limited; waiting ${wait}s`);
    await new Promise((resolve) => setTimeout(resolve, wait * 1000));
  }
}
