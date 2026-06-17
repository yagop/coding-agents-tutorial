// bun run examples/08-production/error-handling.ts

import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();
const model = process.env.ANTHROPIC_DEFAULT_SONNET_MODEL ?? 'claude-sonnet-4-6';

async function ask(body: Anthropic.MessageCreateParamsNonStreaming): Promise<void> {
  try {
    const { data, request_id } = await client.messages.create(body).withResponse();
    const text = data.content.find((b) => b.type === 'text');
    console.log(`ok request_id=${request_id ?? 'n/a'}: ${text?.text ?? ''}`);
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) console.log('rate limited - back off and retry');
    else if (error instanceof Anthropic.APIConnectionTimeoutError) console.log('timed out - retry');
    else if (error instanceof Anthropic.APIConnectionError) console.log('connection failed - retry');
    else if (error instanceof Anthropic.AuthenticationError) console.log('bad credentials - surface, do not retry');
    else if (error instanceof Anthropic.BadRequestError) console.log(`bad request (${error.status}) - fix the call`);
    else if (error instanceof Anthropic.APIError) console.log(`api error ${error.status} request_id=${error.requestID ?? 'n/a'}`);
    else throw error;
  }
}

await ask({ model, max_tokens: 64, messages: [{ role: 'user', content: 'Say hello in three words.' }] });
await ask({ model, max_tokens: 64, messages: [] });
