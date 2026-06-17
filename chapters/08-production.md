# Production and Deployment

🚢 The agent works on your machine; now you ship it. Production is where the happy path stops being the only path - the network blips, the rate limit bites, the bill creeps up, and the process has to live somewhere other than your terminal. This chapter wraps the agent in production armor: a real error strategy, retries and timeouts, rate-limit-aware concurrency, observability, cost control, and a way to deploy.

You already have a working agent from Chapters 1-7, so here you only harden it. As always the key comes from the environment - never hardcode it - and Bun auto-loads `.env`.

## Handling errors and retries

Every API call can fail, and the SDK hands you a typed hierarchy to tell failures apart. `Anthropic.APIError` is the base; the subclasses you branch on are `RateLimitError`, `APIConnectionError` (with `APIConnectionTimeoutError` beneath it), `AuthenticationError`, and `BadRequestError`. The type tells you what to do: retry connection and rate-limit failures, surface auth and bad-request ones - those will not fix themselves on a retry.

<<< @/examples/08-production/error-handling.ts

Run it to watch the ladder catch a deliberately malformed call:

```sh
bun run examples/08-production/error-handling.ts
```

::: warning The retry gotcha
The SDK already retries `408/409/429/5xx` with exponential backoff (tune it with `maxRetries`, default 2). So do NOT wrap every call in your own retry loop - you would double up. Set `maxRetries: 0` only for a non-idempotent call, where a retried tool side effect would happen twice.
:::

When you genuinely own the retries, turn the SDK's off and back off yourself, honoring the `retry-after` header that rides on a 429.

<<< @/examples/08-production/retry-backoff.ts

The per-request `{ maxRetries: 0 }` option hands the retry decision to your loop; everything else stays the SDK default.

## Rate limits and concurrency

Fan out too many requests at once and you will hit the limit. The fix is a small queue with a concurrency cap, watching the `anthropic-ratelimit-requests-remaining` response header to know how much headroom is left.

<<< @/examples/08-production/concurrency-limiter.ts

A fixed pool of workers drains the queue, so no more than `maxConcurrent` calls are ever in flight. Read the remaining-requests header to slow down before you hit a wall, and respect `retry-after` when you do.

## Observability and cost

You cannot debug or budget what you cannot see. Pair every call's `request_id` (from `.withResponse()`) with its `usage`, and accumulate the token counts - including `cache_read_input_tokens` - to turn an opaque agent into a line-item bill.

<<< @/examples/08-production/cost-tracker.ts

Multiply each token count by your model's price for a running total. Three levers keep that number down: pick a cheaper model for easy steps, set `max_tokens` conservatively, and put `cache_control: { type: 'ephemeral' }` on stable system prompts and large tool schemas so repeated input is billed once.

::: details Going deeper: layered cache breakpoints
On a long multi-turn conversation you can place several `cache_control` breakpoints - one on the system prompt, one after the tool schemas - so the cached prefix grows with the chat and each turn re-reads as much as possible from cache.
:::

## Deploying

Finally, the agent needs a home. A long-running process that polls is the simplest; for real traffic a webhook server is leaner - Telegram POSTs each `Update` to your HTTPS endpoint, and you validate its secret header before doing any work.

<<< @/examples/08-production/webhook-server.ts

Bun's built-in `Bun.serve` is the entire server, and the secret-token check rejects anything that is not Telegram. To run it anywhere, containerize it.

<<< @/examples/08-production/Dockerfile

A multi-stage build keeps the image small, `USER bun` drops root, and the secrets arrive at runtime through `docker run -e` - never copied into a layer.

What's next: Chapter 9 - Advanced Topics: RAG, Prompt Engineering, and Fine-Tuning.
