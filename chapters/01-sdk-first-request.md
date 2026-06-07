# The Claude SDK and Your First API Request

Welcome - this is where your coding agent begins. By the end of this chapter you will go from an empty directory to a working `client.messages.create` call on Bun, and you will understand the Anthropic Messages API: one stateless endpoint, `POST /v1/messages`, whose JSON body takes `model`, `max_tokens`, `messages`, and an optional `system` field. The response that comes back - `content` blocks, `stop_reason`, `usage` - is the shape every later chapter builds on. Streaming, tool use, and prompt caching all arrive later; here you nail the foundation they rest on.

Prerequisites: Bun installed and `ANTHROPIC_API_KEY` set in your environment (plus `ANTHROPIC_BASE_URL` if you use a compatible provider). No earlier chapters required.

## Set up and make your first request

You start by scaffolding a project: `bun init` creates a `package.json` and `tsconfig.json`, and `bun add @anthropic-ai/sdk` installs the SDK. Bun runs TypeScript directly, so there is no build or transpile step - you launch a `.ts` file with `bun run`. This repo already ships the `package.json`, `tsconfig.json`, and installed SDK, so if you are following along inside it you can skip `bun init` / `bun add` and just run the file.

Authentication comes from the environment, never from source. Put your key in a `.env` file at the project root:

```
ANTHROPIC_API_KEY=sk-ant-...
```

Bun auto-loads `.env` when it runs a script - there is no `dotenv` to import and no loader to wire up, so `ANTHROPIC_API_KEY` is already set by the time your code runs. Constructing the client with `new Anthropic()` reads that variable for you; if you would rather pass the key explicitly (say, from a secrets manager) use `new Anthropic({ apiKey: myKey })`. Both forms produce the same client, and this tutorial uses the zero-argument form so the key stays out of your code. At the HTTP level that key becomes the `x-api-key` header you will see shortly.

Here is the smallest useful program - construct a client, send one user message, print the reply:

<<< @/examples/01-sdk-first-request/hello.ts

The reply lives in `message.content`, which is an **array** of content blocks, not a string: even a plain text answer arrives as a one-element array holding a `text` block. That is why the code narrows on `block.type === 'text'` before reading `block.text` - the array can hold other block types (like `tool_use`) in later chapters, and the check is what makes `.text` safely typed. Run it:

```sh
bun run examples/01-sdk-first-request/hello.ts
```

You should see a one-sentence answer in your terminal. That motion - construct, create, narrow, read - is the core of the whole SDK.

## Read the whole response

`hello.ts` printed only the text, but the `Message` carries more. Three fields show up in every later chapter: `content`, `stop_reason`, and `usage`. This example also passes a top-level `system` string, which sets the model's behavior without occupying a turn in `messages`.

<<< @/examples/01-sdk-first-request/read-response.ts

Notice the type guard that filters and narrows in one move, and the reuse of the SDK's own `Anthropic.Message` type so your code stays aligned with the API. The `stop_reason` values you will meet here are `end_turn` (finished naturally, the healthy case), `max_tokens` (the cap cut the reply off - raise it if you did not want truncation), and `stop_sequence`; `tool_use` and `refusal` are among the rest you meet later. The two `usage` counts - `input_tokens` for everything you sent, `output_tokens` for what the model generated - are how you reason about cost and, eventually, context size.

The SDK is a convenience layer over plain HTTP, and it is worth seeing exactly what goes on the wire so you can debug with `curl` or reproduce a call anywhere:

<<< @/examples/01-sdk-first-request/curl-equivalent.sh

The JSON body is the same object you pass to `client.messages.create`; the three required headers (`content-type: application/json`, `x-api-key`, `anthropic-version: 2023-06-01`) are what the SDK fills in for you. Note one Bun caveat in the header comment: a shell script does not get `.env` auto-loaded the way a `.ts` file does, so export the key first.

## Pick a model and understand max_tokens

Three model families cover most needs, trading capability against speed and cost. Switching between them is a one-line change, since `model` is just a string - so the next example sends one identical prompt to all three and prints each reply with its token usage:

<<< @/examples/01-sdk-first-request/pick-a-model.ts

`claude-opus-4-8` is the most capable (hard reasoning and complex coding), `claude-sonnet-4-6` is the balanced default, and `claude-haiku-4-5` is the fastest and cheapest for high-volume simple work. The `Anthropic.Model[]` annotation keeps the known IDs documented in your editor while still accepting any string the API supports.

This is the place to nail down `max_tokens`: **it is an upper bound on the response length, not a target.** `max_tokens: 128` does not ask for 128 tokens - it allows at most 128. Finish in 20 and you get a 20-token reply with `stop_reason: 'end_turn'`; run out of room and the reply is truncated with `stop_reason: 'max_tokens'`. Pick a value high enough to fit the answer you expect, and watch `stop_reason` to catch a cap set too low.

## Point at another provider

The same SDK and the same code can talk to any Anthropic-compatible endpoint - the mechanism is `baseURL`, the address the client sends to. Just as `new Anthropic()` reads `ANTHROPIC_API_KEY`, it also reads `ANTHROPIC_BASE_URL`, so setting that one variable (plus the provider's key) repoints your existing code with no edits. You can also pass it explicitly with `new Anthropic({ baseURL })`. Compatible gateways include MiniMax (`https://api.minimax.io/anthropic/v1`) and Z.ai (`https://api.z.ai/api/anthropic`); the model IDs each exposes differ, so adjust the `model` field to match.

The example makes the override explicit, falling back to Anthropic direct when the env var is unset so it runs either way:

<<< @/examples/01-sdk-first-request/custom-base-url.ts

The takeaway: one `client.messages.create` call works against Anthropic direct or any compatible gateway, and switching is a configuration change, not a rewrite.

> Going deeper: Amazon Bedrock and Google Vertex AI use the same Messages API shape but get their own SDK packages - `@anthropic-ai/bedrock-sdk` and `@anthropic-ai/vertex-sdk` - because they authenticate through their cloud's credentials rather than a plain API key. Bedrock also uses `anthropic.`-prefixed model IDs. Both expose the same `messages.create` surface, so everything here carries over. We stay on Anthropic direct for the rest of the tutorial.

## What's next

Chapter 2 - Streaming Responses and Message Types - streams tokens as they are generated and walks the full set of content block types your agent will use.
