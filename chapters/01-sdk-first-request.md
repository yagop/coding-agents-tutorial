# The Claude SDK and Your First API Request

This chapter takes you from an empty directory to a working `client.messages.create` call running on Bun. Along the way you will learn the shape of the Anthropic Messages API - the single `POST /v1/messages` endpoint that every later chapter builds on. Get the request body (`model`, `max_tokens`, `messages`, optional `system`) and the response (`content` blocks, `stop_reason`, `usage`) straight here, and every streaming and tool-calling pattern later in the tutorial is just a variation on this one foundation.

Prerequisites: Bun installed and an Anthropic API key. No earlier chapters are required - this is the starting point.

## The Messages API at a glance

The entire Anthropic API you need for this tutorial is one endpoint:

```
POST https://api.anthropic.com/v1/messages
```

It is stateless. Each request is self-contained: you send a JSON body describing the model and the conversation so far, and you get back one response. The server keeps no memory of previous calls - if you want a multi-turn conversation, you resend the whole history every time (that is Chapter 4's job). For now, one request in, one response out.

The request body has four fields that matter at this stage:

- `model` - which model to run, for example `claude-sonnet-4-6`.
- `max_tokens` - the maximum number of tokens the model may generate in its reply (an upper bound, covered below).
- `messages` - the conversation as an array of turns, each `{ role: 'user' | 'assistant', content }`.
- `system` - optional top-level instructions that set the model's role and rules. It is not a message turn; it sits alongside `messages`.

The response is a `Message` object whose three fields you will read constantly: `content` (an array of content blocks), `stop_reason` (why the model stopped), and `usage` (how many tokens were billed). We will pick each apart shortly.

## Project setup

You need a Bun + TypeScript project with the `@anthropic-ai/sdk` package installed. From an empty directory:

```sh
bun init
bun add @anthropic-ai/sdk
```

`bun init` scaffolds a `package.json` and a `tsconfig.json` and asks a couple of questions; accept the defaults. The key detail is that Bun runs TypeScript directly - there is no separate build or transpile step. A `.ts` file is executed with `bun run path/to/file.ts`.

A minimal `package.json` is all you need. `"type": "module"` lets you use top-level `await` and `import` syntax:

```json
{
  "name": "my-agent",
  "type": "module",
  "dependencies": {
    "@anthropic-ai/sdk": "^0.102.0"
  }
}
```

And a minimal `tsconfig.json` that targets a modern runtime and lets Bun resolve modules:

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "types": ["bun"]
  }
}
```

This repository already provides a `package.json`, a `tsconfig.json`, and the installed SDK at its root, so if you are following along inside the tutorial repo you can skip `bun init` and `bun add` entirely and just run the example files.

## Authorization: where the SDK reads your key

The SDK authenticates with your Anthropic API key. The golden rule: **never hardcode the key in source.** Keep it in the environment.

Put it in a `.env` file at the root of your project:

```
ANTHROPIC_API_KEY=sk-ant-...
```

Bun loads `.env` automatically when it runs a script - there is no `dotenv` package to import and no loader to wire up. By the time your code runs, `process.env.ANTHROPIC_API_KEY` is already set. (The `.env` file should be git-ignored; this repo ignores it for you.)

When you construct the client with no arguments, it reads that variable for you:

```ts
const client = new Anthropic(); // reads process.env.ANTHROPIC_API_KEY
```

If you would rather pass the key explicitly - for example when you load it from a secrets manager rather than an env var - use the options object:

```ts
const client = new Anthropic({ apiKey: myKey });
```

Both forms produce the same client. Throughout this tutorial we use the zero-argument form so the key stays in the environment and never appears in code. At the HTTP level this key becomes the `x-api-key` request header, which you will see in the curl example below.

## Your first request

Here is the smallest useful program: construct a client, send one user message, and print the reply.

<<< @/examples/01-sdk-first-request/hello.ts

Walking through it: `new Anthropic()` builds the client from the environment. `client.messages.create` sends the request and resolves to a `Message`. We pass the three required fields - `model`, `max_tokens`, and `messages` - where `messages` is a single `user` turn whose `content` is a plain string. (A turn's `content` can also be an array of content blocks; you will use that form once you start sending images and tool results, but a string is the common case for plain text.)

The reply lives in `message.content`, which is an **array** of content blocks, not a string. Even a simple text answer arrives as a one-element array containing a text block. That is why the code reads `message.content[0]` and checks `first.type === 'text'` before touching `first.text`: the array can hold other block types (such as `tool_use` or `thinking` in later chapters), and narrowing on `block.type` is what makes `block.text` safely typed as a `string`. Skipping the check would be a type error, and for good reason - not every block has a `.text`.

Run it:

```sh
bun run examples/01-sdk-first-request/hello.ts
```

You should see a one-sentence answer printed to your terminal. That round trip - construct, create, narrow, read - is the core motion of the entire SDK.

## Reading the whole response

`hello.ts` printed only the text. The `Message` carries more, and three fields in particular show up in every later chapter: `content`, `stop_reason`, and `usage`.

<<< @/examples/01-sdk-first-request/read-response.ts

This version also passes a top-level `system` string. The system prompt sets the model's behavior ("be concise, answer in one short paragraph") without occupying a turn in the `messages` array - it is guidance about *how* to respond, separate from the conversation itself.

A few things to note in how it reads the response:

**`content` is an array you can have more than one block in.** Instead of grabbing `content[0]`, this example filters the array down to text blocks and joins them. The type guard `(block): block is Anthropic.TextBlock => block.type === 'text'` does double duty: it filters at runtime and narrows the type so `block.text` is available. Reusing the SDK's own exported types (`Anthropic.Message`, `Anthropic.TextBlock`) keeps your code aligned with the API and saves you from hand-writing shapes.

**`stop_reason` tells you why the model stopped.** Its possible values are:

- `end_turn` - the model finished naturally. This is the normal, healthy case.
- `max_tokens` - the model hit your `max_tokens` cap and the reply was cut off mid-thought. If you see this and did not want a truncated answer, raise `max_tokens`.
- `stop_sequence` - generation stopped because it produced one of your configured stop sequences.
- `tool_use` - the model wants to call a tool and is handing control back to you (Chapter 5).
- `pause_turn` - a long-running turn was paused and can be continued.
- `refusal` - the model declined to continue for safety reasons.

It can also be `null` while a response is still streaming. For a plain blocking call like this one, expect `end_turn` - and treat `max_tokens` as a signal that your cap was too low.

**`usage` reports billed tokens for this single request.** `usage.input_tokens` counts everything you sent (system prompt, message history, the lot) and `usage.output_tokens` counts what the model generated. These two numbers are how you reason about cost and, later, how you decide when a conversation has grown too large for its context window.

## The same request as raw curl

The SDK is a convenience layer over plain HTTP. It is worth seeing exactly what goes on the wire, both to demystify the SDK and so you can debug with `curl` or reproduce a call in any language.

<<< @/examples/01-sdk-first-request/curl-equivalent.sh

This is the same model, `max_tokens`, and message as `hello.ts`, expressed as an HTTP POST. Three headers are required on every Messages API request:

- `content-type: application/json` - the body is JSON.
- `x-api-key: <your key>` - authentication. This is the header the SDK fills in from `ANTHROPIC_API_KEY`; it is the raw equivalent of `new Anthropic()` reading your key.
- `anthropic-version: 2023-06-01` - the API version. The SDK sends this for you automatically; with raw `curl` you must include it yourself. It pins the request/response shape so your code does not break when the API evolves.

The JSON body is the exact same object you pass to `client.messages.create`. That is the whole point: the SDK builds this request, sends it, and parses the JSON response back into the typed `Message` you read in the previous section.

One Bun-specific caveat shown in the file's header comment: Bun auto-loads `.env` for `.ts` scripts, but a shell script run with `bash` does not get that treatment. Export `ANTHROPIC_API_KEY` in your shell (or source the `.env` file) before running the script, or the `x-api-key` header will be empty.

## Picking a model

Three model families cover most needs, trading capability against speed and cost:

- `claude-opus-4-8` - the most capable model. Reach for it on hard reasoning, complex multi-step coding, and tasks where quality matters most.
- `claude-sonnet-4-6` - the balanced default. Strong intelligence at much lower latency and cost than Opus; a sensible starting point for an agent.
- `claude-haiku-4-5` - the fastest and cheapest. Ideal for high-volume, simpler work like classification, routing, or quick transformations.

Switching models is a one-line change: the `model` field is just a string. The following example sends one identical prompt to all three and prints each reply alongside its token usage, so you can feel the tradeoffs directly.

<<< @/examples/01-sdk-first-request/pick-a-model.ts

Notice the type annotation `Anthropic.Model[]` on the array of model IDs - another SDK-exported type that keeps the known identifiers documented in your editor while still accepting any string the API supports.

This example is also the right place to nail down what `max_tokens` actually means. **It is an upper bound on the response length, not a target.** Setting `max_tokens: 128` does not ask the model for 128 tokens of output; it tells the model it may use *at most* 128. If the model finishes its thought in 20 tokens, you get a 20-token reply and `stop_reason: 'end_turn'`. If 128 tokens are not enough to finish, the reply is truncated and `stop_reason` comes back as `'max_tokens'`. So pick a `max_tokens` high enough to fit the answer you expect, and watch `stop_reason` to catch cases where you guessed too low. It is a safety cap against runaway generation, not a knob for verbosity.

## Other Anthropic-compatible providers

Anthropic direct is the default, but the same SDK and the same code can talk to any Anthropic-compatible endpoint. The mechanism is the `baseURL`: where the client sends its requests. Just as `new Anthropic()` reads `ANTHROPIC_API_KEY` from the environment, it also reads `ANTHROPIC_BASE_URL`. Set that one variable and your existing code points at a different provider - no code change required. You can also pass it explicitly with `new Anthropic({ baseURL })`.

Two compatible gateways you can point at this way:

- MiniMax: `https://api.minimax.io/anthropic`
- Z.ai: `https://api.z.ai/api/anthropic`

For each, set `ANTHROPIC_BASE_URL` to the gateway URL and `ANTHROPIC_API_KEY` to that provider's key. The model IDs a gateway exposes differ from Anthropic's, so adjust the `model` field to whatever the provider offers.

The next example makes the override explicit by passing `baseURL` to the constructor, falling back to Anthropic direct when the env var is unset so it runs either way:

<<< @/examples/01-sdk-first-request/custom-base-url.ts

The takeaway: one `client.messages.create` call works against Anthropic direct or any compatible gateway, and switching between them is a configuration change, not a rewrite.

Two cloud platforms get their own dedicated SDK packages rather than a `baseURL` override, because they authenticate through their cloud's credentials instead of a plain API key:

- Amazon Bedrock via `@anthropic-ai/bedrock-sdk` (note that Bedrock uses `anthropic.`-prefixed model IDs).
- Google Vertex AI via `@anthropic-ai/vertex-sdk`.

Both expose the same `messages.create` surface you have been using, so what you learn here carries over directly. We will stay on Anthropic direct for the rest of the tutorial.

## What's next

You can now send a request, read `content`, `stop_reason`, and `usage`, map a call to raw HTTP, and choose a model. Next up: Chapter 2 - Streaming Responses and Message Types, where you stream tokens as they are generated and meet the full set of content block types your agent will work with.
