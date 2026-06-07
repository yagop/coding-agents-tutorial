# Chapter 1: The Claude SDK and Your First API Request

This chapter gets you from an empty directory to a working Claude request using the `@anthropic-ai/sdk` package on Bun. By the end you will have made a real call with `client.messages.create`, read the response apart block by block, seen the exact `curl` the SDK sends on your behalf, compared the three current models, and pointed the client at a custom gateway.

Everything later in this tutorial - streaming, tool calls, conversation memory, the Telegram bot - is a variation on the single request you build here. The Anthropic Messages API is one endpoint, `POST /v1/messages`, and it is stateless: each call carries its full input and returns a complete response with no server-side session. Learn the shape of that one call and the rest of the book is composition.

The five runnable examples for this chapter live under `examples/01-sdk-first-request/`. Work through them in this order:

1. `hello.ts` - your first `client.messages.create` call.
2. `read-response.ts` - taking the response apart: `content` blocks, `stop_reason`, `usage`.
3. `curl-equivalent.sh` - the same request as raw `curl`, so you can see what the SDK sends.
4. `pick-a-model.ts` - the same prompt across Opus, Sonnet, and Haiku.
5. `custom-base-url.ts` - constructing the client against a custom `baseURL`.

## Prerequisites

This is the starting chapter, so it assumes nothing from earlier chapters. You do need:

- **Bun installed.** Bun is both the runtime and the package manager. Verify with `bun --version`.
- **An Anthropic API key.** Create one in the Anthropic Console. The SDK reads it from the `ANTHROPIC_API_KEY` environment variable by default - you never pass it in code.

Each example is standalone and runs directly with `bun run` - no build or transpile step.

## The Messages API at a glance

The Anthropic API exposes a single core endpoint for chat-style generation: `POST /v1/messages`. You send a JSON body and get back a JSON message. There is no session to open, no conversation ID to track. The endpoint is stateless: if you want the model to remember the previous turn, you resend the previous turns - that is what Chapter 4 is about. For now, one request, one response.

The request body has four parts you will use constantly:

- `model` - which Claude to call, for example `claude-opus-4-8`.
- `max_tokens` - the maximum number of tokens the model may generate in its reply. This is an upper bound, not a target: a short answer stops early. It is required.
- `messages` - the conversation so far, an array of `{ role, content }` turns where `role` is `"user"` or `"assistant"` and `content` is a string or an array of content blocks.
- `system` - optional top-level instructions that set the model's persona and rules. It is not a message turn; it is a separate field.

The response carries:

- `content` - an array of content blocks. A plain text answer is a single block of `type: "text"`, but the array can hold other block types (`tool_use`, `thinking`) in later chapters, which is why it is an array.
- `stop_reason` - why generation stopped: `end_turn` (the model finished naturally), `max_tokens` (it hit your limit), `stop_sequence` (it produced one of your stop strings), `tool_use` (it wants to call a tool, Chapter 5), or `refusal`. The SDK type also includes `pause_turn`, and the field can be `null` while a response is still in flight.
- `usage` - token accounting, including `usage.input_tokens` (what you spent sending the prompt) and `usage.output_tokens` (what the model generated). This is how you reason about cost.

## Project setup

Create and initialize a project from scratch, then add the SDK:

```
mkdir my-agent && cd my-agent
bun init -y
bun add @anthropic-ai/sdk
```

`bun init` scaffolds a `package.json` and a `tsconfig.json`, and `bun add @anthropic-ai/sdk` installs the SDK and records it as a dependency. Because Bun executes TypeScript directly, there is nothing else to configure - `bun run some-file.ts` just works, with no separate build step.

A minimal `package.json` after those commands looks like this. The two fields that matter are `"type": "module"` (so `import` works) and the SDK under `dependencies`:

```json
{
  "name": "my-agent",
  "type": "module",
  "dependencies": {
    "@anthropic-ai/sdk": "^0.102.0"
  },
  "devDependencies": {
    "@types/bun": "latest",
    "typescript": "^5.9.0"
  }
}
```

A minimal `tsconfig.json` for Bun enables strict typing and tells the toolchain to expect Bun's globals:

```json
{
  "compilerOptions": {
    "lib": ["ESNext"],
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "types": ["bun"],
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true
  }
}
```

This repository already ships both files at its root, with the SDK installed, so you do not have to run `bun init` to follow along - just clone the repo and run the examples. The block above is what you would create yourself when starting a fresh project.

Put your key in a `.env` file at the project root. Bun loads `.env` automatically, so the variable is visible to every example without any loader code and without importing a package like `dotenv`:

```
ANTHROPIC_API_KEY=sk-ant-...
```

Never hardcode the key in source, and never commit `.env`. Add it to `.gitignore`.

## Authorization: how the SDK finds your key

Construct the client with no arguments:

```ts
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()
```

`new Anthropic()` reads `ANTHROPIC_API_KEY` from the environment - and because Bun auto-loads the root `.env` into the environment, putting the key there is enough; the client picks it up with no extra wiring. This is the form used throughout the tutorial: it keeps secrets out of the codebase.

You *can* pass the key explicitly with `new Anthropic({ apiKey })`, but you should only do that when the key comes from somewhere other than the default environment variable - for example a secrets manager - and even then the value should come from the environment at runtime, never a hardcoded literal in your source. The rule is simple: never hardcode keys.

Under the hood the SDK sends the key as the `x-api-key` request header, alongside `anthropic-version: 2023-06-01`. You will see both directly in the `curl` example below.

## Example 1: `hello.ts` - your first call

`examples/01-sdk-first-request/hello.ts` is the smallest useful program: construct the client, call `client.messages.create`, and print the first text block.

```ts
// bun run examples/01-sdk-first-request/hello.ts
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

const message = await client.messages.create({
  model: 'claude-opus-4-8',
  max_tokens: 1024,
  messages: [{ role: 'user', content: 'In one sentence, what is the Anthropic Messages API?' }],
})

const first = message.content[0]
if (first.type === 'text') {
  console.log(first.text)
}
```

Two things to notice. First, `max_tokens` is required and is a ceiling - the one-sentence answer here uses only a handful of tokens, well under the 1024 limit. Second, you cannot read `.text` straight off `message.content[0]`, because a content block is a union of types. Narrowing on `first.type === 'text'` is what lets TypeScript (and you) safely reach `.text`. That narrowing pattern recurs in every chapter.

Run it:

```
bun run examples/01-sdk-first-request/hello.ts
```

## Example 2: `read-response.ts` - reading the whole response

`hello.ts` printed one block and stopped. `examples/01-sdk-first-request/read-response.ts` opens the entire response: it walks every content block, narrowing on `block.type === 'text'` before reading `block.text`, then prints `stop_reason` and reports token usage from `usage.input_tokens` and `usage.output_tokens`.

The three fields to internalize:

- `content` is an **array of blocks**, each with a `type`. Iterate and narrow on `block.type` - do not assume index 0 is text. Reading `block.text` is only safe inside a `block.type === 'text'` check.
- `stop_reason` tells you *why* the model stopped. `end_turn` means it finished on its own; `max_tokens` means your ceiling cut it off and you may want to raise `max_tokens` or continue the turn; `stop_sequence`, `tool_use`, and `refusal` are the other values you will meet as the tutorial progresses.
- `usage` is your cost meter. `input_tokens` is what you paid to send the prompt; `output_tokens` is what the model generated. Multiply each by your model's per-token price to get the cost of the call.

`read-response.ts` is the example to revisit whenever a later chapter introduces a new block type - the same loop keeps working because you are switching on `block.type` rather than guessing.

```
bun run examples/01-sdk-first-request/read-response.ts
```

## Example 3: `curl-equivalent.sh` - the request without the SDK

The SDK is a thin, typed wrapper over an HTTP call. `examples/01-sdk-first-request/curl-equivalent.sh` issues the exact same request with `curl` so there is no mystery about what travels over the wire. It is a plain POSIX shell script - run it with `bash` or `sh`, not `bun` - and it reads `$ANTHROPIC_API_KEY` straight from the environment.

A Messages request needs three headers:

- `content-type: application/json`
- `x-api-key: $ANTHROPIC_API_KEY` - your key, the same one the SDK reads
- `anthropic-version: 2023-06-01` - the API version; the SDK sends this for you

The body is the same JSON object you passed to `client.messages.create`: `model`, `max_tokens`, and `messages`. The whole call against `https://api.anthropic.com/v1/messages` is:

```
curl https://api.anthropic.com/v1/messages \
  -H "content-type: application/json" \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "claude-opus-4-8",
    "max_tokens": 1024,
    "messages": [
      { "role": "user", "content": "In one sentence, what is the Anthropic Messages API?" }
    ]
  }'
```

Run it after exporting your key:

```
bash examples/01-sdk-first-request/curl-equivalent.sh
```

Seeing the raw call makes the SDK legible: `client.messages.create({...})` is this POST, plus typing, retries, and error classes you meet in Chapter 8.

## Example 4: `pick-a-model.ts` - choosing a model

There are three current models, and they trade capability against speed and cost:

- `claude-opus-4-8` - the most capable; reach for it on hard reasoning, planning, and code.
- `claude-sonnet-4-6` - a balance of speed and intelligence; a strong default for interactive agents.
- `claude-haiku-4-5` - the fastest and cheapest; ideal for classification, routing, and high-volume triage.

`examples/01-sdk-first-request/pick-a-model.ts` sends the *same* prompt to all three and prints each reply alongside its `usage`, so you can compare answer quality and token cost side by side. Run it and watch how the cheaper, faster model often suffices for simple prompts - picking the right model per task is the first cost lever you have, and Chapter 8 returns to it in depth.

Remember that `max_tokens` is independent of model choice: it is an **upper bound** on the reply, not a target length. It caps how long the reply may be; it does not ask the model for a reply of that length. A small `max_tokens` truncates a long answer (you will see `stop_reason: "max_tokens"`); a large one simply allows a long answer if the model has one to give, and a short answer still stops early at `end_turn`.

```
bun run examples/01-sdk-first-request/pick-a-model.ts
```

## Example 5: `custom-base-url.ts` - pointing at a gateway

By default the client talks to Anthropic directly. You can redirect it at a different host that speaks the same Messages API. Several providers expose an Anthropic-compatible endpoint - for example MiniMax at `https://api.minimax.io/anthropic/v1` and z.ai at `https://api.z.ai/api/anthropic`. Because they accept the same request shape, your code does not change; only the base URL does.

There are two ways to set the base URL, and they mirror how the key is handled:

- **From the environment.** Just as `new Anthropic()` reads `ANTHROPIC_API_KEY`, it also reads `ANTHROPIC_BASE_URL` from the environment automatically. Set `ANTHROPIC_BASE_URL` (and the matching key) in your `.env`, construct the client with `new Anthropic()`, and the exact same code now talks to the gateway. Unset it and you are back on Anthropic direct. Switching providers is a one-line environment change with no code edit.
- **Explicitly in code.** Pass `new Anthropic({ baseURL })` (optionally with `apiKey`) to point a single client at a specific endpoint regardless of the environment.

`examples/01-sdk-first-request/custom-base-url.ts` reads `ANTHROPIC_BASE_URL` from the environment and makes the same `client.messages.create` call against whichever endpoint is configured. The point is that only construction - or just the environment - changes; every `messages.create` you write stays identical, whether you are on Anthropic direct or a compatible gateway.

For the major clouds, the same model is available through dedicated companion packages instead of a `baseURL`:

- **Amazon Bedrock** via `@anthropic-ai/bedrock-sdk` - note that Bedrock uses `anthropic.`-prefixed model IDs.
- **Google Vertex AI** via `@anthropic-ai/vertex-sdk`.

Those packages expose the same `messages.create` surface, so the rest of the tutorial transfers unchanged. This chapter stays on the Anthropic-direct default; `custom-base-url.ts` is the one place we point elsewhere.

```
bun run examples/01-sdk-first-request/custom-base-url.ts
```

## What you learned

- The Messages API is one stateless endpoint, `POST /v1/messages`, with a JSON body of `model`, `max_tokens`, `messages`, and optional `system`.
- `new Anthropic()` reads `ANTHROPIC_API_KEY` from the environment (Bun auto-loads it from the root `.env`); the raw request sends it as `x-api-key` with `anthropic-version: 2023-06-01`. Never hardcode keys.
- A response is an array of `content` blocks - narrow on `block.type === "text"` before reading `block.text` - plus `stop_reason` (`end_turn`, `max_tokens`, `stop_sequence`, `tool_use`, `refusal`) and `usage.input_tokens` / `usage.output_tokens`.
- `claude-opus-4-8`, `claude-sonnet-4-6`, and `claude-haiku-4-5` trade capability for speed and cost, and `max_tokens` is an upper bound on the reply, not a target.
- `ANTHROPIC_BASE_URL` (or `new Anthropic({ baseURL })`) lets the same code target a compatible gateway like MiniMax or z.ai just by changing the environment, and companion SDKs cover Bedrock and Vertex.

## What's next

Chapter 2 (Streaming Responses and Message Types) takes this same `client.messages.create` call and streams it, so output appears token by token instead of all at once. You will meet the server-sent-events wire format, the `client.messages.stream()` helper, and the full set of content block types you will rely on for tools and thinking later.
