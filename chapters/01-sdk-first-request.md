# The Claude SDK and Your First API Request

🚀 Your coding agent starts here. We'll turn an empty folder into a working `client.messages.create` call on Bun, and you'll get comfortable with the Anthropic Messages API along the way - one stateless endpoint that every later chapter builds on.

Everything in this chapter is a single round trip: you send a JSON body, you get one `Message` back, and the server remembers nothing between calls.

```text
   your code
      │
      ▼
  ┌─────────────────────────────────────────────────┐
  │  REQUEST   POST /v1/messages                    │
  │    model, max_tokens, messages, system?         │
  └─────────────────────────────────────────────────┘
      │
      ▼
  ┌─────────────────────────────────────────────────┐
  │  RESPONSE  Message                              │
  │    content[], stop_reason, usage                │
  └─────────────────────────────────────────────────┘
```

Prerequisites: Bun installed and your API credentials in a `.env` file at the project root (the next section explains which variables). No earlier chapters required.

## Set up and make your first request

You start by scaffolding a project: `bun init` creates a `package.json` and `tsconfig.json`, and `bun add @anthropic-ai/sdk` installs the SDK. Bun runs TypeScript directly, so there is no build step - you launch a `.ts` file with `bun run`.

::: tip This repo is already set up
The `package.json`, `tsconfig.json`, and the installed SDK already ship here, so if you are following along inside the repo you can skip `bun init` / `bun add` and just run the files.
:::

Authentication comes from the environment, never from source. Put your credentials in a `.env` file at the project root - Bun auto-loads it, so there is no `dotenv` to import:

```
# Anthropic direct
ANTHROPIC_API_KEY=sk-ant-...

# ...or point at a compatible provider instead (see the last section)
ANTHROPIC_BASE_URL=https://api.z.ai/api/anthropic
ANTHROPIC_AUTH_TOKEN=your-provider-token
```

Three variables drive every example, and `new Anthropic()` reads all of them for you:

| variable | what it does |
|---|---|
| `ANTHROPIC_API_KEY` | your Anthropic key, sent as the `x-api-key` header - enough on its own for Anthropic direct |
| `ANTHROPIC_AUTH_TOKEN` | an alternative credential sent as `Authorization: Bearer ...`; some providers (Z.ai) use this instead |
| `ANTHROPIC_BASE_URL` | which endpoint to call; unset means Anthropic direct (`https://api.anthropic.com`) |

::: warning Keep secrets in the environment
This repo git-ignores `.env`; never hardcode keys. To inject one from a secrets manager, pass it explicitly: `new Anthropic({ apiKey: myKey })`.
:::

Here is the smallest useful program - construct a client, send one user message, print the reply:

<<< @/examples/01-sdk-first-request/hello.ts

The reply lives in `message.content`, an **array** of content blocks, not a string: even a plain text answer arrives as a one-element array holding a `text` block. That is why the code checks `type === 'text'` before reading `.text` - other block types (like `tool_use`) show up in later chapters, and the check is what makes `.text` safely typed. Run it:

```sh
bun run examples/01-sdk-first-request/hello.ts
```

You should see a one-sentence answer in your terminal. That motion - construct, create, narrow, read - is the core of the whole SDK.

## Read the whole response

`hello.ts` printed only the text, but the `Message` carries more. Three fields show up in every later chapter: `content`, `stop_reason`, and `usage`. This example also passes a top-level `system` string, which steers the model without taking a turn in `messages`.

<<< @/examples/01-sdk-first-request/read-response.ts

Note the result typed as the SDK's own `Anthropic.Message`, and the loop over `message.content` that prints every block's `type` and narrows to read `text`. The `stop_reason` values you meet here: `end_turn` (finished naturally, the healthy case), `max_tokens` (the cap cut the reply off), and `stop_sequence` (a stop string you configured was emitted); `tool_use` and `refusal` are among the rest you meet later. The two `usage` counts - `input_tokens` for everything you sent, `output_tokens` for what came back - are how you reason about cost and, eventually, context size.

The SDK is a convenience layer over plain HTTP, and it is worth seeing what goes on the wire so you can debug with `curl` or reproduce a call anywhere:

<<< @/examples/01-sdk-first-request/curl-equivalent.sh

The JSON body is the same object you pass to `client.messages.create`. Three headers are required: `content-type: application/json`, `anthropic-version: 2023-06-01`, and your auth - `x-api-key` for Anthropic direct or `Authorization: Bearer ...` for a token-based provider.

## Pick a model and understand max_tokens

Three model families trade capability against speed and cost. Switching is a one-line change, since `model` is just a string - so the next example sends one prompt to all three and prints each reply with its token usage:

<<< @/examples/01-sdk-first-request/pick-a-model.ts

- `claude-opus-4-8` - most capable; hard reasoning and complex coding.
- `claude-sonnet-4-6` - the balanced default.
- `claude-haiku-4-5` - fastest and cheapest for high-volume simple work.

The `Anthropic.Model[]` annotation keeps the known IDs in your editor while still accepting any string the API supports.

This is the place to nail down `max_tokens`: **it is an upper bound on the response length, not a target.** `max_tokens: 16` allows at most 16 tokens, it does not request them. Finish early and you get a short reply with `stop_reason: 'end_turn'`; run out of room and the reply is truncated with `stop_reason: 'max_tokens'`. Pick a value that fits the answer you expect, and watch `stop_reason` to catch a cap set too low.

## Point at another provider

The same SDK and the same code can talk to any Anthropic-compatible endpoint - the mechanism is `baseURL`. Just as `new Anthropic()` reads `ANTHROPIC_API_KEY`, it also reads `ANTHROPIC_AUTH_TOKEN` and `ANTHROPIC_BASE_URL`, so setting those repoints your existing code with no edits. Compatible gateways include MiniMax (`https://api.minimax.io/anthropic`) and Z.ai (`https://api.z.ai/api/anthropic`); the model IDs differ, so set `ANTHROPIC_DEFAULT_SONNET_MODEL` (and the opus/haiku variants) to the provider's models - every example reads those with a Claude fallback, so the code never changes.

<<< @/examples/01-sdk-first-request/custom-base-url.ts

One `client.messages.create` call works against Anthropic direct or any compatible gateway - switching is configuration, not a rewrite.

::: details Going deeper: Amazon Bedrock and Google Vertex AI
Both speak the same Messages API but ship their own SDK packages - `@anthropic-ai/bedrock-sdk` and `@anthropic-ai/vertex-sdk` - because they authenticate through their cloud's credentials rather than a plain API key. Bedrock also uses `anthropic.`-prefixed model IDs. The `messages.create` surface is identical, so everything here carries over. We stay on Anthropic direct for the rest of the tutorial.
:::

## What's next

Chapter 2 - Streaming Responses and Message Types - streams tokens as they are generated and walks the full set of content block types your agent will use.
