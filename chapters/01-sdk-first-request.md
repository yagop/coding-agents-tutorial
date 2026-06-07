# Chapter 1: The Claude SDK and Your First API Request

This chapter takes you from an empty directory to a working `client.messages.create` call running on Bun. Along the way you will learn the shape of the Anthropic Messages API: the single `POST /v1/messages` endpoint that every later chapter builds on. Once you understand the request body (`model`, `max_tokens`, `messages`, optional `system`) and the response (`content` blocks, `stop_reason`, `usage`), every streaming and tool-calling pattern in the rest of the tutorial is just a variation on this one foundation.

The examples in this chapter live under `examples/01-sdk-first-request/`. Each one is standalone and runs on its own with `bun run`. We will introduce them in order: `hello.ts`, `read-response.ts`, `curl-equivalent.sh`, `pick-a-model.ts`, and `custom-base-url.ts`.

## The Messages API at a glance

The Anthropic Messages API is small. There is essentially one endpoint you care about:

```
POST https://api.anthropic.com/v1/messages
```

It is stateless. Each request carries the full conversation you want the model to see, and the server returns a single response. The server does not remember anything between calls. If you want a multi-turn conversation, you send the whole history every time (we build exactly that in later chapters). For now, one request, one response.

The request body is JSON with a few fields:

- `model` - which model to use, for example `claude-sonnet-4-6`.
- `max_tokens` - the maximum number of tokens the model may generate in its reply.
- `messages` - an array of turns, each `{ role: "user" | "assistant", content: ... }`.
- `system` - optional top-level instructions that set the model's behavior or persona.

The response is also JSON: a `Message` object whose most important fields are `content` (an array of content blocks), `stop_reason` (why the model stopped), and `usage` (how many tokens went in and came out). That is the entire surface you need for this chapter. Everything that follows is detail.

## Project setup: Bun + TypeScript + the SDK

You need two things installed before you start: Bun (the runtime and package manager used throughout this tutorial) and an Anthropic API key. Verify Bun with:

```sh
bun --version
```

If you were starting a brand new project from scratch, you would run:

```sh
bun init
bun add @anthropic-ai/sdk
```

`bun init` scaffolds a `package.json` and a `tsconfig.json` and sets `"type": "module"` so you can use ESM `import` syntax. `bun add @anthropic-ai/sdk` installs the official Anthropic TypeScript SDK and records it as a dependency. A minimal `package.json` looks like this:

```json
{
  "name": "coding-agents-tutorial",
  "private": true,
  "type": "module",
  "dependencies": {
    "@anthropic-ai/sdk": "^0.102.0"
  },
  "devDependencies": {
    "@types/bun": "^1.3.0",
    "typescript": "^5.9.0"
  }
}
```

And a minimal `tsconfig.json` that lets Bun run `.ts` files directly, with no build or transpile step:

```json
{
  "compilerOptions": {
    "lib": ["ESNext"],
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "types": ["bun"],
    "strict": true,
    "skipLibCheck": true
  }
}
```

This repository already provides a `package.json` and `tsconfig.json` at its root, so you do not need to run `bun init` or `bun add` yourself. Just make sure dependencies are installed once with `bun install`, and you are ready to run any example. Because Bun executes TypeScript natively, every example is a single `.ts` file you launch with `bun run` - there is no compile step and no separate output directory.

## Authentication: where the SDK reads your key

The SDK authenticates with an API key. By default, it reads that key from the `ANTHROPIC_API_KEY` environment variable. The cleanest way to provide it is a `.env` file at the repository root:

```
ANTHROPIC_API_KEY=sk-ant-...
```

Bun loads `.env` automatically before your code runs, so the variable is available on `process.env` with no extra setup. You do not need the `dotenv` package and you should not import it; Bun already does this for you.

When you write `new Anthropic()` with no arguments, the SDK looks up `process.env.ANTHROPIC_API_KEY` for you. This is the form we use everywhere in this tutorial:

```ts
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic(); // reads ANTHROPIC_API_KEY from the environment
```

You can also pass the key explicitly:

```ts
const client = new Anthropic({ apiKey: process.env.MY_KEY });
```

Passing it explicitly is occasionally useful (for example, when you read the key from a secret manager under a different name), but the value should still come from the environment.

Never hardcode an API key in source. Do not paste `sk-ant-...` into a `.ts` file, and do not commit your `.env`. A leaked key can be used by anyone and bills to your account. Keep secrets in the environment, always.

## Your first request: hello.ts

The first example, `examples/01-sdk-first-request/hello.ts`, is the smallest useful program: construct the client, send one message, and print the model's reply.

```ts
// bun run examples/01-sdk-first-request/hello.ts
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const message = await client.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 256,
  messages: [{ role: "user", content: "In one sentence, what is a coding agent?" }],
});

const first = message.content[0];
if (first.type === "text") {
  console.log(first.text);
}
```

Run it:

```sh
bun run examples/01-sdk-first-request/hello.ts
```

A few things are worth calling out. The default import is the client class itself: `import Anthropic from "@anthropic-ai/sdk"`. The SDK's types live as members of that same name, so you can refer to `Anthropic.Message`, `Anthropic.MessageParam`, `Anthropic.ContentBlock`, and so on without a separate import. `client.messages.create(...)` returns a `Promise<Anthropic.Message>`, which is why we `await` it. The three required fields are `model`, `max_tokens`, and `messages`; everything else is optional.

Notice that we do not blindly read `message.content[0].text`. The `content` array is a list of typed blocks, and only some block types have a `text` field. We narrow with `first.type === "text"` before touching `first.text`. That narrowing is not just good hygiene - in TypeScript it is what makes `first.text` type-check at all. We will lean on this pattern constantly.

## Reading the full response: read-response.ts

`hello.ts` reads one field. A real agent needs to understand the whole response. The next example, `examples/01-sdk-first-request/read-response.ts`, inspects the three fields that matter most: `content`, `stop_reason`, and `usage`.

```ts
// bun run examples/01-sdk-first-request/read-response.ts
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const message = await client.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 256,
  system: "You are a concise assistant. Answer in one short paragraph.",
  messages: [{ role: "user", content: "Explain what an API key is." }],
});

// content is an array of content blocks; collect the text ones.
const text = message.content
  .filter((block) => block.type === "text")
  .map((block) => block.text)
  .join("");

console.log("text:", text);
console.log("stop_reason:", message.stop_reason);
console.log("input_tokens:", message.usage.input_tokens);
console.log("output_tokens:", message.usage.output_tokens);
```

Run it:

```sh
bun run examples/01-sdk-first-request/read-response.ts
```

This example also shows the optional `system` field. A system prompt sets the model's behavior or persona for the whole request; it is separate from the `messages` array and is not a "user" or "assistant" turn.

### content: an array of blocks

`message.content` is always an array, even for a plain text reply (which arrives as a single block). Each entry is a content block with a `type` discriminator. For now you will only see `text` blocks, but the same array later carries `tool_use`, `tool_result`, and `thinking` blocks. The robust way to read text is to filter or narrow on `block.type === "text"` and read `block.text`, exactly as above. Reaching for `content[0].text` works in the simple case but breaks the moment a non-text block appears first.

### stop_reason: why the model stopped

`message.stop_reason` tells you why generation ended. The values you will encounter are:

- `end_turn` - the model finished its reply naturally. This is the normal, healthy case.
- `max_tokens` - the model hit your `max_tokens` limit and was cut off mid-response. If you see this and the answer looks truncated, raise `max_tokens`.
- `stop_sequence` - generation stopped because it produced one of your configured stop sequences.
- `tool_use` - the model wants to call a tool. We rely on this heavily starting in the tools chapter.
- `refusal` - the model declined to continue for safety reasons.

(There is also a `pause_turn` value used by certain long-running server tools; you can ignore it for now.) Checking `stop_reason` is how you tell "done" from "cut off" from "wants a tool", so an agent should always look at it rather than assuming the text is complete.

### usage: counting tokens

`message.usage` reports `usage.input_tokens` (tokens in your prompt, including the system prompt and message history) and `usage.output_tokens` (tokens the model generated). These two numbers are what billing is based on, and tracking them is how you reason about cost. Keep an eye on them - in later chapters, when conversations grow and tools feed large results back into the prompt, `input_tokens` is often where cost quietly accumulates.

## The same call as raw curl: curl-equivalent.sh

The SDK is a convenience wrapper over a plain HTTPS request. Seeing the raw request demystifies what is happening and helps when you debug from the command line or from a language without an SDK. `examples/01-sdk-first-request/curl-equivalent.sh` is the same request as a shell script.

```sh
# sh examples/01-sdk-first-request/curl-equivalent.sh
#
# Sends the same request as hello.ts using raw curl.
# Reads ANTHROPIC_API_KEY from the environment. No SDK, no jq required.

curl https://api.anthropic.com/v1/messages \
  --header "content-type: application/json" \
  --header "x-api-key: $ANTHROPIC_API_KEY" \
  --header "anthropic-version: 2023-06-01" \
  --data '{
    "model": "claude-sonnet-4-6",
    "max_tokens": 256,
    "messages": [
      { "role": "user", "content": "In one sentence, what is a coding agent?" }
    ]
  }'
```

Run it with a shell, not Bun (it is a `.sh` script, not TypeScript):

```sh
sh examples/01-sdk-first-request/curl-equivalent.sh
```

Three headers carry everything the SDK was setting for you:

- `content-type: application/json` - the body is JSON.
- `x-api-key: $ANTHROPIC_API_KEY` - your credential. This is exactly what `new Anthropic()` does under the hood, just reading the same environment variable. (Note: the API uses an `x-api-key` header, not a bearer `Authorization` token.)
- `anthropic-version: 2023-06-01` - the API version. This is required on every request, and `2023-06-01` is the current value. The SDK adds it automatically.

The JSON body is identical to the object you passed to `client.messages.create`: `model`, `max_tokens`, and `messages`. That is the whole point - the SDK call and this curl invocation send the same request. The script reads `$ANTHROPIC_API_KEY` from the environment so you never have to paste the key inline.

## Picking a model: pick-a-model.ts

The `model` field selects which Claude model handles the request. There are three you will reach for most:

- `claude-opus-4-8` - the most capable model. Best for hard reasoning, tricky code, and multi-step agent work where quality matters most.
- `claude-sonnet-4-6` - the balanced choice, trading a little capability for more speed and lower cost. A strong default for most agent work.
- `claude-haiku-4-5` - the fastest and cheapest. Ideal for high-volume, latency-sensitive, or simpler tasks.

The example `examples/01-sdk-first-request/pick-a-model.ts` sends the same prompt to all three so you can compare the output and the token usage side by side.

```ts
// bun run examples/01-sdk-first-request/pick-a-model.ts
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const models: Anthropic.Model[] = [
  "claude-opus-4-8",
  "claude-sonnet-4-6",
  "claude-haiku-4-5",
];

for (const model of models) {
  const message = await client.messages.create({
    model,
    max_tokens: 128,
    messages: [{ role: "user", content: "Name one benefit of streaming API responses." }],
  });

  const text = message.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");

  console.log(`\n=== ${model} ===`);
  console.log(text);
  console.log(`tokens in/out: ${message.usage.input_tokens}/${message.usage.output_tokens}`);
}
```

Run it:

```sh
bun run examples/01-sdk-first-request/pick-a-model.ts
```

While you are here, internalize one thing about `max_tokens`: it is an upper bound on the response, not a target length. Setting `max_tokens: 1024` does not ask for a 1024-token answer; it caps the reply at 1024 tokens. If the model has a one-sentence answer, you get one sentence and a small `output_tokens` count. The only time `max_tokens` changes the content is when the response would have been longer than the cap - then it is cut off and `stop_reason` comes back as `max_tokens`. Set it high enough that real answers are not truncated, but understand it as a ceiling, not a request.

## Other Anthropic-compatible providers: custom-base-url.ts

The same SDK can talk to endpoints other than Anthropic's own. Anything that speaks the Messages API protocol works, because the SDK just sends `POST /v1/messages` to whatever base URL it is pointed at. You control that with the `baseURL` setting.

Just like the API key, the SDK reads the base URL from the environment automatically. `new Anthropic()` picks up `ANTHROPIC_BASE_URL` from `process.env` if it is set, falling back to Anthropic's own endpoint otherwise. So the single line `const client = new Anthropic()` works unchanged against Anthropic direct or against a compatible gateway - you only change the environment variable. You can also pass the URL explicitly with `new Anthropic({ baseURL })`.

Example compatible endpoints include:

- `https://api.minimax.io/anthropic/v1`
- `https://api.z.ai/api/anthropic`

The example `examples/01-sdk-first-request/custom-base-url.ts` shows the pattern.

```ts
// bun run examples/01-sdk-first-request/custom-base-url.ts
import Anthropic from "@anthropic-ai/sdk";

// new Anthropic() reads ANTHROPIC_BASE_URL (and ANTHROPIC_API_KEY) from the
// environment. The line below is equivalent to that default when the env var
// is set; it just makes the source explicit.
const baseURL = process.env.ANTHROPIC_BASE_URL ?? "https://api.anthropic.com";

const client = new Anthropic({ baseURL });

const message = await client.messages.create({
  // On a compatible gateway, use whatever model name that provider exposes.
  model: process.env.MODEL ?? "claude-sonnet-4-6",
  max_tokens: 128,
  messages: [{ role: "user", content: "Say hello in five words." }],
});

const first = message.content[0];
if (first.type === "text") {
  console.log(first.text);
}
```

Run it (set `ANTHROPIC_BASE_URL` and a matching key in your environment first if you want to hit a gateway):

```sh
bun run examples/01-sdk-first-request/custom-base-url.ts
```

The takeaway is that your code does not change. The same `client.messages.create` call, the same request/response shape, works against Anthropic direct or a compatible gateway - you just point `ANTHROPIC_BASE_URL` at a different host. When using a gateway, set `model` to whatever model name that provider exposes; the `model` field accepts any string, so custom names are fine.

Two clouds are worth a separate mention because they use dedicated SDKs rather than a base URL swap. For Amazon Bedrock there is `@anthropic-ai/bedrock-sdk`, which authenticates with AWS credentials and uses `anthropic.`-prefixed model IDs. For Google Vertex AI there is `@anthropic-ai/vertex-sdk`, which authenticates with Google Cloud credentials. Both expose the same `messages.create` surface you just learned, so the request and response shapes carry over directly; only client construction and authentication differ. The rest of this tutorial uses the standard `@anthropic-ai/sdk` against Anthropic direct.

## What's next

You can now set up a project, authenticate, send a request, read the response, and point the SDK at different providers. In Chapter 2, Streaming Responses and Message Types, you will turn that single blocking call into a live stream so your agent can show output as it is generated, and you will meet the full set of content block types that the rest of the tutorial builds on.
