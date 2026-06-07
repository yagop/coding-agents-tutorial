# Build Your Own Coding Agent with the Anthropic SDK (TypeScript + Bun)

This tutorial walks you through building a working coding agent from scratch using the Anthropic TypeScript SDK (the `@anthropic-ai/sdk` package) and the Bun runtime. You will start with a single API request and finish with an agent that streams responses, calls tools, manages conversation context, and talks to users through both a terminal REPL and a Telegram bot.

It is written for developers who are comfortable with TypeScript but new to building agents. You do not need prior experience with the Anthropic Messages API, large language models, or function calling - each concept is introduced as you need it.

Every chapter is self-contained. Instead of one growing codebase, each chapter ships its own standalone, runnable examples under `examples/NN-slug/`. You can jump to any chapter and run its examples directly without having completed the earlier ones. Each example is a single `.ts` file you launch with `bun run`.

## Prerequisites

Before you start, make sure you have the following:

- **Bun installed.** Bun is the runtime and package manager used throughout. Install it from the official instructions and verify with `bun --version`.
- **An Anthropic API key.** Create one in the Anthropic Console. The SDK reads it from the `ANTHROPIC_API_KEY` environment variable by default.
- **A Telegram bot token from BotFather.** Chapter 3 onward wires the agent to Telegram via `node-telegram-bot-api`. Message `@BotFather` on Telegram, run `/newbot`, and save the token it gives you.
- **Basic TypeScript.** You should be comfortable with `async`/`await`, types and interfaces, and importing packages. No agent-specific background is assumed.

## Repository layout

Examples live under `examples/`, one directory per topic, named `NN-slug`:

```
.
|-- .env                 # local secrets, not committed
|-- package.json
`-- examples/
    |-- 01-sdk-first-request/
    |   `-- first-call.ts
    |-- 02-streaming/
    |-- 03-repl-telegram/
    `-- ...
```

Keys go in a `.env` file at the repository root, which Bun loads automatically:

```
ANTHROPIC_API_KEY=sk-ant-...
TELEGRAM_BOT_TOKEN=123456:ABC-...
```

Run any example by pointing `bun run` at its file:

```
bun run examples/01-sdk-first-request/first-call.ts
```

Because Bun reads `.env` for you, there is no extra config loader to set up - the environment variables are available to every example.

## Conventions

- **TypeScript + Bun.** All examples are TypeScript files executed directly with `bun run`. No separate build or transpile step is required.
- **The `@anthropic-ai/sdk` package.** Every chapter uses the official Anthropic TypeScript SDK. We rely on its real surface only - `client.messages.create`, `client.messages.stream`, content blocks (`text`, `tool_use`, `tool_result`, `thinking`), and fields like `stop_reason`, `usage`, `system`, `tools`, `input_schema`, `tool_choice`, and `cache_control`. No invented methods.
- **ASCII punctuation only.** Code and prose use plain ASCII: `-` instead of dashes, `->` for arrows, and `...` for ellipses.

## Table of contents

1. [The Claude SDK and Your First API Request](#chapter-1-the-claude-sdk-and-your-first-api-request)
2. [Streaming Responses and Message Types](#chapter-2-streaming-responses-and-message-types)
3. [Handling User Requests: REPL and Telegram Bot](#chapter-3-handling-user-requests-repl-and-telegram-bot)
4. [Context and Conversation Management](#chapter-4-context-and-conversation-management)
5. [Implementing Tools and Function Calling](#chapter-5-implementing-tools-and-function-calling)
6. [Building Tool Chains and Complex Workflows](#chapter-6-building-tool-chains-and-complex-workflows)
7. [Advanced Agent Patterns](#chapter-7-advanced-agent-patterns)
8. [Production and Deployment](#chapter-8-production-and-deployment)
9. [Advanced Topics: RAG, Prompt Engineering, and Fine-Tuning](#chapter-9-advanced-topics-rag-prompt-engineering-and-fine-tuning)
10. [Real-World Patterns: Research, Automation, and Support](#chapter-10-real-world-patterns-research-automation-and-support)

## Chapter 1: The Claude SDK and Your First API Request

This chapter gets you from an empty directory to a working Claude request using the `@anthropic-ai/sdk` package on Bun. You will learn the shape of the Anthropic Messages API - the single `POST /v1/messages` endpoint every later chapter builds on - and make your first typed call with `client.messages.create`. Understanding the request body (`model`, `max_tokens`, `system`, `messages`) and the response (`content` blocks, `stop_reason`, `usage`) here means every tool-calling and streaming pattern later is just a variation on this foundation.

**Learning objectives**
- Initialize a Bun + TypeScript project and install the Anthropic SDK.
- Authenticate via `ANTHROPIC_API_KEY` and understand where the SDK reads credentials.
- Send a request with `client.messages.create` and read `content`, `stop_reason`, and `usage` off the response.
- Map the same call to a raw `curl` request, including the `anthropic-version` and `x-api-key` headers.
- Choose between Opus, Sonnet, and Haiku and reason about what `max_tokens` controls.

**What it covers**
- The Messages API at a glance: one endpoint (`POST /v1/messages`), a stateless request/response model, and the JSON body shape (`model`, `max_tokens`, `messages`, optional `system`).
- Project setup: `bun init`, `bun add @anthropic-ai/sdk`, and a minimal `tsconfig` / `package.json` so `bun run` executes a `.ts` file directly.
- Authorization: constructing `new Anthropic()` (reads `ANTHROPIC_API_KEY` from the environment) vs `new Anthropic({ apiKey })`, and the raw header equivalent `x-api-key`. Never hardcode keys; keep them in the environment.
- Compatible providers: Anthropic direct (default `baseURL`), Amazon Bedrock via `@anthropic-ai/bedrock-sdk` (note the `anthropic.`-prefixed model IDs), Google Vertex via `@anthropic-ai/vertex-sdk`, and pointing at an OpenAI-compatible gateway/proxy (for example OpenRouter) by passing a custom `baseURL`.
- The raw `curl` call: the required headers `content-type: application/json`, `x-api-key`, and `anthropic-version: 2023-06-01`, plus the JSON body - so you can see exactly what the SDK sends.
- Reading the response: `content` is an array of content blocks (narrow on `block.type === "text"` before reading `block.text`), `stop_reason` (`end_turn`, `max_tokens`, `tool_use`, `refusal`, ...), and `usage.input_tokens` / `usage.output_tokens`.
- Picking a model: `claude-opus-4-8` (most capable), `claude-sonnet-4-6` (speed/intelligence balance), `claude-haiku-4-5` (fastest/cheapest), and what `max_tokens` means - an upper bound on the response, not a target length.

**Code samples** (`examples/01-sdk-first-request/`)
- `hello.ts` - first `client.messages.create` call printing the first text block.
- `read-response.ts` - inspecting `content` blocks, `stop_reason`, and `usage` on the returned message.
- `curl-equivalent.sh` - the same request as raw `curl` with `anthropic-version` and `x-api-key` headers.
- `pick-a-model.ts` - same prompt across `claude-opus-4-8`, `claude-sonnet-4-6`, and `claude-haiku-4-5` to compare output and token usage.
- `custom-base-url.ts` - constructing the client with a custom `baseURL` for an OpenAI-compatible gateway/proxy.

**Key APIs and concepts**: `client.messages.create`, `model`, `max_tokens`, `system`, `messages`, `content`, `stop_reason`, `usage.input_tokens`, `usage.output_tokens`, `x-api-key`, `anthropic-version`, `ANTHROPIC_API_KEY`, `baseURL`

**Prerequisites**: Bun installed and an Anthropic API key exported as `ANTHROPIC_API_KEY`. No prior chapters required; this is the starting point. Each example is standalone and runs with `bun run`.

## Chapter 2: Streaming Responses and Message Types

Waiting for a full response before showing any output creates a poor user experience, especially for long code explanations or multi-step reasoning. This chapter covers how to stream tokens from the Anthropic API as they are generated, so your agent can display partial output in real time. You will learn the full server-sent events (SSE) wire format that underpins streaming, and how the TypeScript SDK wraps it into ergonomic helpers. Understanding the event sequence and content block lifecycle here is essential groundwork before you add tool calls and thinking blocks in later chapters.

**Learning objectives**
- Explain the latency and UX tradeoff that motivates streaming and when to prefer it over a blocking `create` call.
- Use `client.messages.stream()` and its helper methods to accumulate text deltas and retrieve a final `Message` object.
- Map each SSE event type (`message_start`, `content_block_start`, `content_block_delta`, `content_block_stop`, `message_delta`, `message_stop`) to the data it carries.
- Read incremental and final token counts from `usage` fields on `message_start` and `message_delta` events.
- Recognize the full set of content block types (`text`, `tool_use`, `tool_result`, `thinking`) so later chapters build on a familiar foundation.

**What it covers**
- Blocking vs. streaming: why `create` buffers the whole response and how streaming surfaces tokens as `text_delta` events, reducing time-to-first-token.
- `client.messages.stream()` as the primary streaming entry point: it returns a `MessageStream` object that emits typed events and exposes promise-based helpers.
- The complete SSE event sequence in order: `message_start` (carries initial `usage.input_tokens`), `content_block_start` (opens a block with its `index` and `type`), `content_block_delta` (delivers `text_delta` or `input_json_delta` per block type), `content_block_stop`, `message_delta` (carries `stop_reason` and final `usage.output_tokens`), and `message_stop`.
- Stream helper methods: `.on('text', (text) => ...)` for incremental text chunks, `.on('message', (msg) => ...)` for the completed message, and `await stream.finalMessage()` to get the fully assembled `Message` once the stream closes.
- Accumulating deltas manually: concatenating `event.delta.text` values across `content_block_delta` events when building a custom renderer or non-helper integration.
- Content block type overview: `text` blocks (covered now), and `tool_use` / `tool_result` / `thinking` blocks (previewed here, covered fully in Chapters 5 and 7).
- Extracting token usage: `message_start.message.usage.input_tokens` for prompt cost and `message_delta.usage.output_tokens` for completion cost, enabling per-request token accounting.
- The alternative `create({ stream: true })` low-level path, which returns an async-iterable stream of `RawMessageStreamEvent` objects for cases where you need direct SSE access without the `MessageStream` wrapper.

**Code samples** (`examples/02-streaming/`)
- `basic-stream.ts` - streams a response with `client.messages.stream()` and prints each text chunk using the `.on('text', ...)` event handler.
- `final-message.ts` - calls `await stream.finalMessage()` after streaming to log the complete `Message` object including `stop_reason` and assembled content blocks.
- `manual-delta.ts` - consumes `client.messages.stream()` via async iteration, accumulating `text_delta` values manually to show the raw event-by-event flow.
- `token-usage.ts` - captures `usage.input_tokens` from `message_start` and `usage.output_tokens` from `message_delta` to print a per-request cost summary.
- `raw-stream.ts` - uses `client.messages.create({ stream: true })` to iterate over `RawMessageStreamEvent` objects and log each event type and payload.

**Key APIs and concepts**: `client.messages.stream`, `client.messages.create` with `stream: true`, `MessageStream`, `.on('text', ...)`, `.on('message', ...)`, `await stream.finalMessage()`, `RawMessageStreamEvent`, `message_start`, `content_block_start`, `content_block_delta`, `text_delta`, `input_json_delta`, `content_block_stop`, `message_delta`, `message_stop`, `stop_reason`, `usage.input_tokens`, `usage.output_tokens`, content block types (`text`, `tool_use`, `tool_result`, `thinking`)

**Prerequisites**: Chapter 1 (SDK setup, `client` instantiation, and a basic `client.messages.create` call); no additional setup required - examples are standalone Bun scripts.

## Chapter 3: Handling User Requests: REPL and Telegram Bot

A coding agent is fundamentally a loop: read input, call Claude, emit output, repeat. This chapter builds two concrete frontends for that loop - a terminal REPL driven by Bun's stdin API and a Telegram bot powered by `node-telegram-bot-api` - so you can see how the same Claude call slots into different I/O contexts. You will also learn to stream Claude's response tokens into a live Telegram message by repeatedly editing it as `client.messages.stream` emits chunks, which gives users the fast, progressive feel of the Claude.ai interface. By the end you will have two runnable agents that accept real user input and reply with Claude-generated text.

**Learning objectives**
- Implement a terminal REPL in Bun that reads stdin line-by-line, calls `client.messages.create`, and prints replies in a continuous loop.
- Configure a Telegram bot via BotFather, receive messages through polling, and route them to Claude.
- Stream Claude output back to a Telegram chat by editing an in-flight message as `text` content blocks arrive.
- Handle real-world edge cases: empty input, `/commands`, Telegram's 4096-character message limit, and Telegram's own edit rate limits.
- Understand why agents are loops and how the choice of transport (CLI vs. bot) does not change the core Claude API call.

**What it covers**
- The agent loop pattern: why every agent is a read-input -> build-messages -> call-Claude -> emit-output cycle, and how `stop_reason: "end_turn"` signals loop continuation vs. termination.
- A minimal Bun REPL using `for await` over `process.stdin` lines, building a `messages` array with `role: "user"` and `role: "assistant"` entries, and passing them to `client.messages.create`.
- BotFather setup: creating a bot, obtaining the token, and the difference between polling (long-poll via `getUpdates`) and webhook transports in `node-telegram-bot-api`.
- Receiving `message` events from the `TelegramBot` instance and extracting `msg.chat.id` and `msg.text` to construct the `user` turn.
- Wiring the Telegram handler to `client.messages.create` and calling `bot.sendMessage` with the first `text` content block's `text` field from the response.
- Streaming with `client.messages.stream`, listening to the `text` event for incremental chunks, and calling `bot.editMessageText` on a placeholder message to push updates to Telegram.
- Telegram's own limits when live-editing: batch tokens and call `bot.editMessageText` at most about once per second, handle the "message is not modified" error when an edit is identical, and respect Telegram's `retry_after` on 429 - a naive per-token edit loop gets the bot throttled almost immediately.
- Defensive input handling: skipping empty or whitespace-only messages, recognising `/start` and `/help` commands before hitting the API, and splitting replies that exceed Telegram's 4096-character per-message limit.
- Reading the `usage` field (`input_tokens`, `output_tokens`) from the completed stream's final message to log per-turn cost in both frontends.

**Code samples** (`examples/03-repl-telegram/`)
- `repl.ts` - minimal terminal REPL that loops over stdin, calls `client.messages.create`, and prints the `text` content block.
- `repl-stream.ts` - same REPL but uses `client.messages.stream` and prints tokens as they arrive via the `text` event.
- `telegram-bot.ts` - Telegram bot using polling that routes incoming messages to `client.messages.create` and replies with `bot.sendMessage`.
- `telegram-stream.ts` - streaming Telegram bot that sends a placeholder message then calls `bot.editMessageText` on a throttled cadence (about once per second) as `text` chunks arrive, handling Telegram's "message is not modified" and rate-limit errors.
- `input-guard.ts` - utility demonstrating empty-input detection, `/command` parsing, and 4096-character reply chunking before sending.

**Key APIs and concepts**: `client.messages.create`, `client.messages.stream`, `stream.on("text", ...)`, `stream.finalMessage()`, `stop_reason`, `usage`, `text` content block, `role: "user"` / `role: "assistant"`, `TelegramBot` polling mode, `bot.sendMessage`, `bot.editMessageText`, `msg.chat.id`

**Prerequisites**: Chapter 1 (SDK setup and `client.messages.create`), Chapter 2 (streaming and message types); externally requires a Telegram bot token from BotFather and `ANTHROPIC_API_KEY` in the environment - examples are standalone and load both from `.env` via Bun's built-in dotenv support.

## Chapter 4: Context and Conversation Management

The Anthropic Messages API is stateless: every call to `client.messages.create` must supply the full conversation history as the `messages` array. This chapter shows how to build the stateful layer that makes a chatbot feel coherent across turns - accumulating history, enforcing context window limits, and efficiently reusing stable content. Getting this layer right is what separates a one-shot script from a real agent that can hold context over dozens of exchanges.

**Learning objectives**
- Construct and maintain a correctly alternating `messages` array across multiple user and assistant turns.
- Set and tune system prompts to establish agent persona and behavior constraints.
- Measure conversation size with `client.messages.countTokens` and apply trimming or summarization before hitting the context limit.
- Use `cache_control` on stable prompt prefixes to reduce both latency and token cost.
- Implement per-user session storage in memory and persist sessions to disk for the Telegram bot.

**What it covers**
- Structure of the `messages` array: alternating `role: "user"` and `role: "assistant"` turns, each with a `content` field that accepts a string or an array of content blocks (`text`, `tool_use`, `tool_result`).
- Appending the assistant reply: extracting `response.content` from the `client.messages.create` return value and pushing it back into the history as an `assistant` turn before the next user message.
- System prompt placement: passing a `system` string (or array of `text` blocks with `cache_control`) to `client.messages.create` to set persona, rules, and stable background context without occupying a conversation turn.
- Token counting with `client.messages.countTokens`: calling it with the same `model`, `system`, `messages`, and `tools` payload before sending to `create`, then branching on the result to stay inside the model's context window. The window limit is model-specific (retrievable via the Models API, for example `client.models.retrieve(...)`) and counts vary by model version, so tie the threshold to your chosen model rather than hard-coding a number.
- Trimming strategies: dropping the oldest user/assistant pairs (always in pairs to preserve alternation), or keeping only the last N turns as a rolling window.
- Summarization strategy: when a conversation grows too long, calling `client.messages.create` with a summarize instruction, replacing the accumulated turns with a single injected `user`/`assistant` summary pair, and continuing.
- Prompt caching with `cache_control: { type: "ephemeral" }` on the final `text` block of the `system` array and on large stable `user` turns. The cached prefix must exceed the model's minimum cacheable size (about 4096 tokens on Opus 4.x and Haiku 4.5, about 2048 on Sonnet 4.6) or `cache_control` silently no-ops, and it must be byte-stable across requests (a changing timestamp invalidates it). Verify hits via `usage.cache_read_input_tokens` and `usage.cache_creation_input_tokens`.
- Per-user session isolation: keying an in-memory `Map<string, MessageParam[]>` by Telegram `chat.id`, then serializing and reloading sessions from a JSON file so history survives bot restarts.

**Code samples** (`examples/04-context/`)
- `multi-turn.ts` - builds a REPL loop that appends each assistant `content` block back into the `messages` array and prints the running turn count.
- `system-prompt.ts` - demonstrates passing a `system` string and a `system` block array to shape agent persona, then verifies the persona holds across three turns.
- `token-counter.ts` - calls `client.messages.countTokens` before every `create`, logs `input_tokens`, and triggers a rolling-window trim when the count exceeds a model-specific threshold.
- `summarize-history.ts` - detects an oversized context, sends a summarization request to `client.messages.create`, then replaces the history with the condensed summary and continues the conversation.
- `prompt-cache.ts` - attaches `cache_control: { type: "ephemeral" }` to a sufficiently large, byte-stable system block, makes repeated calls, and prints `usage.cache_read_input_tokens` to confirm cache hits.
- `telegram-sessions.ts` - manages a `Map<number, MessageParam[]>` keyed by `chat.id`, persists sessions to `sessions.json` on each update, and reloads them on startup.

**Key APIs and concepts**: `client.messages.create`, `client.messages.countTokens`, `client.models.retrieve`, `messages` array, `role: "user"` / `role: "assistant"`, `content` blocks, `system` parameter, `cache_control: { type: "ephemeral" }`, `usage.cache_read_input_tokens`, `usage.cache_creation_input_tokens`, `usage.input_tokens`, rolling-window trimming, summarization strategy, per-user session map

**Prerequisites**: Chapters 1-3 (SDK setup, message response shape, and Telegram bot wiring); no external services required for the core examples; the Telegram session sample reuses the bot token from Chapter 3.

## Chapter 5: Implementing Tools and Function Calling

Tools are how your agent reaches outside the model: reading files, calling APIs, running queries. This chapter covers the core tool-use protocol of the Messages API - you declare tools, the model decides when to call one and returns a `tool_use` block, your code executes it, and you feed a `tool_result` block back so the model can continue. The model never runs your code; it only emits structured requests and reads structured results, and you own the loop in between. Getting this single round-trip right is the foundation for every multi-tool workflow in the chapters that follow.

**Learning objectives**
- Define a tool with `name`, `description`, and a JSON Schema `input_schema`, and pass it via the `tools` array.
- Detect `stop_reason: "tool_use"`, extract the `tool_use` block, and dispatch to a handler function.
- Send results back as a `tool_result` block (matching `tool_use_id`) and let the model finish its turn.
- Validate tool arguments and return failures to the model with `is_error: true`.
- Write tool descriptions and schemas that make the model pick the right tool reliably.

**What it covers**
- The tool-use contract: how `tools`, `input_schema` (JSON Schema with `type`, `properties`, `required`, `enum`), and the model's `tool_use` content block fit together.
- The full single-tool loop with `client.messages.create`: read `response.content` for `text` and `tool_use` blocks, check `stop_reason`, append the assistant turn verbatim, then send a user turn whose content is `tool_result` blocks.
- Why `tool_use_id` must be echoed back exactly, and why every `tool_use` block in a turn needs a matching `tool_result`.
- Mapping `block.name` to a handler and parsing `block.input` (already a parsed object via the SDK - never raw-string-match the serialized JSON).
- Argument validation and error reporting: returning a `tool_result` with `is_error: true` and an informative message so the model can recover or retry, rather than throwing.
- `tool_choice` modes (`auto`, `any`, `tool`, `none`) and `disable_parallel_tool_use` to steer or force a specific tool.
- Writing effective tool descriptions: prescriptive "call this when..." wording, per-property descriptions, and `enum` for fixed value sets so the model disambiguates correctly.
- Using `Anthropic.Tool`, `Anthropic.ToolUseBlock`, and `Anthropic.ToolResultBlockParam` SDK types instead of hand-rolled interfaces.

**Code samples** (`examples/05-tools/`)
- `define-tool.ts` - declares a single `get_weather` tool with `input_schema` and inspects the returned `tool_use` block without yet executing it.
- `single-tool-loop.ts` - runs the full create -> detect `tool_use` -> execute -> send `tool_result` -> final answer round-trip.
- `dispatch-handlers.ts` - maps `block.name` to typed handler functions and parses `block.input` into arguments.
- `tool-errors.ts` - validates arguments and returns a `tool_result` with `is_error: true` for bad or failing calls so the model adapts.
- `tool-choice.ts` - compares `auto`, `any`, and `{ type: "tool", name }` to force or suppress tool use, plus `disable_parallel_tool_use`.

**Key APIs and concepts**: `client.messages.create`, `tools`, `name`, `description`, `input_schema` (JSON Schema: `type`, `properties`, `required`, `enum`), content blocks `text` and `tool_use` (`id`, `name`, `input`), `stop_reason: "tool_use"`, `tool_result` block (`tool_use_id`, `content`, `is_error`), `tool_choice` (`auto` | `any` | `tool` | `none`), `disable_parallel_tool_use`, `Anthropic.ToolUseBlock`, `Anthropic.ToolResultBlockParam`

**Prerequisites**: Chapters 1-2 (sending requests, reading content blocks and `stop_reason`) and Chapter 4 (appending turns to maintain conversation state) make this easier, but each example is standalone and runnable with `bun run`. Requires `ANTHROPIC_API_KEY` in the environment.

## Chapter 6: Building Tool Chains and Complex Workflows

Chapter 5 wired up a single tool call and fed one `tool_result` back. Real agents rarely stop there - they call a tool, read the result, decide on the next tool, and keep going until the task is done. This chapter builds the core engine of any agent: the loop that drives `client.messages.create` repeatedly until `stop_reason` is `end_turn`. You will handle multi-step chains where one tool's output becomes the next tool's input, parallel tool calls returned in a single turn, dependency ordering, and steering the model with `tool_choice`. The payoff is one reusable agent-loop runner you can drop into the REPL and Telegram surfaces from Chapter 3.

**Learning objectives**
- Implement the agent loop: call the model, execute any `tool_use` blocks, append `tool_result` blocks, and repeat until `stop_reason === "end_turn"`.
- Chain tools sequentially so the result of one call informs the model's next call.
- Detect and execute multiple `tool_use` blocks from one assistant turn, returning all `tool_result` blocks together in a single user message.
- Reason about dependencies and ordering, and force behavior with `tool_choice` (`auto`, `any`, specific tool, `disable_parallel_tool_use`).
- Extract a generic, reusable agent-loop runner that takes a tool registry and runs to completion.

**What it covers**
- The control flow of the loop: branch on `stop_reason` (`tool_use` -> keep going, `end_turn` -> done, `max_tokens` / `pause_turn` -> handle), and never break on the first response.
- Conversation accumulation: always append the full assistant `response.content` (preserving every `tool_use` block) before appending the matching `tool_result` blocks, so each `tool_use_id` is answered exactly once.
- Sequential chaining: a tool whose output the model reads and then feeds into a second tool call on the next iteration (for example, look up an ID, then fetch details for that ID).
- Parallel tool use: a single assistant turn containing several `tool_use` blocks; filter them with `b.type === "tool_use"`, execute (optionally concurrently with `Promise.all`), and collect one `tool_result` per block.
- Ordering and dependencies: when results are independent return them in one batch; when one call depends on another the model naturally serializes across turns. Use `tool_choice: { type, disable_parallel_tool_use: true }` to force at most one tool per turn.
- `tool_choice` modes: `{ type: "auto" }` (default), `{ type: "any" }` (must use some tool), `{ type: "tool", name }` (force a specific tool), and `{ type: "none" }` - plus why forcing a tool changes when you check for `end_turn`.
- A generic runner: a `Map` of tool name -> handler plus the `Anthropic.Tool[]` definitions, a `maxIterations` guard against runaway loops, and `is_error: true` on `tool_result` so the model can recover from failures.
- Where the SDK `toolRunner` helper (`betaZodTool` + `client.beta.messages.toolRunner`) fits, and why writing the loop by hand first makes its behavior legible.

**Code samples** (`examples/06-tool-chains/`)
- `agent-loop.ts` - minimal hand-written loop that runs `client.messages.create` until `stop_reason === "end_turn"`.
- `sequential-chain.ts` - two tools where the model feeds the first result into a second call across turns.
- `parallel-tools.ts` - one assistant turn with multiple `tool_use` blocks executed via `Promise.all`, results returned in one user message.
- `tool-choice.ts` - compares `auto`, `any`, a forced specific tool, and `disable_parallel_tool_use`.
- `agent-runner.ts` - reusable runner: tool registry `Map`, `maxIterations` guard, and `is_error` tool-result handling.
- `runner-with-stream.ts` - the runner wired to `client.messages.stream` + `finalMessage()` so each step streams text while looping.

**Key APIs and concepts**: `client.messages.create`, `client.messages.stream`, `finalMessage()`, `stop_reason` (`tool_use`, `end_turn`, `max_tokens`, `pause_turn`), `response.content`, `tool_use` / `tool_result` content blocks, `tool_use_id`, `is_error`, `tools`, `input_schema`, `tool_choice` (`auto` / `any` / `tool` / `none`, `disable_parallel_tool_use`), `Anthropic.MessageParam`, `Anthropic.ToolUseBlock`, `Anthropic.ToolResultBlockParam`, `client.beta.messages.toolRunner`.

**Prerequisites**: Chapter 5 (defining tools, `input_schema`, single tool-call round trip) is the direct foundation; Chapter 2 (streaming, `stop_reason`, content-block types) helps for `runner-with-stream.ts`. Each example is standalone in `examples/06-tool-chains/`, run with `bun run`, and needs `ANTHROPIC_API_KEY` in the environment.

## Chapter 7: Advanced Agent Patterns

This chapter moves beyond single-turn tool use into full autonomous agent loops that plan, reason, self-correct, and delegate. You will learn how to keep a loop running only as long as it is making progress - enforcing step budgets and explicit stopping conditions so the agent never spins indefinitely. Extended thinking gives the model scratchpad space for multi-step reasoning before it commits to a tool call or answer, and reflection passes let the agent critique its own output before returning it to the caller. Error recovery, structured output via forced tool choice, and lightweight orchestration patterns round out the chapter, giving you the building blocks for production-grade agents.

**Learning objectives**
- Design and implement an autonomous `tool_use` loop with step budgets and well-defined stopping conditions driven by `stop_reason`.
- Enable and interpret extended thinking via the `thinking` parameter (adaptive mode on current models; the legacy `budget_tokens` form on older ones) and read `thinking` content blocks from the response.
- Apply reflection and self-critique by injecting the prior draft back as a `user` turn that asks the model to evaluate its own output before finalizing.
- Recover gracefully from API errors and tool failures inside the loop using `Anthropic.APIError`, retry logic, and fallback messages.
- Force structured, machine-readable output by supplying a strict JSON `input_schema` and setting `tool_choice` to a named tool.

**What it covers**
- Anatomy of an autonomous loop: accumulating `messages`, inspecting `stop_reason` (`tool_use` vs `end_turn` vs `max_tokens`), and enforcing a `maxSteps` budget to prevent runaway execution.
- Extended thinking: enabling the top-level `thinking` parameter so the model emits `thinking` content blocks before its answer. On current models use `thinking: { type: "adaptive" }` (optionally `output_config: { effort: "low" | "medium" | "high" }`); on 4.6 and earlier the deprecated `thinking: { type: "enabled", budget_tokens: N }` form applies. Thinking tokens count toward `usage` - check the docs for your target model.
- Multi-step planning patterns: using a planning tool call to produce an explicit task list, then iterating over subtasks in subsequent loop iterations.
- Reflection pass: after the agent produces a draft answer, appending that draft as a new `user` message that prompts the model to identify flaws and improve it before the loop exits. (A `tool_result` block is only valid as a reply to a matching `tool_use`, so reflection uses a plain `user` turn, not a fabricated `tool_result`.)
- Error recovery inside the loop: catching `Anthropic.RateLimitError` and `Anthropic.APIError`, surfacing tool-level failures as `tool_result` blocks with `is_error: true`, and deciding whether to retry or abort the step.
- Structured output via `tool_choice`: setting `tool_choice: { type: "tool", name: "emit_result" }` with a tight `input_schema` to guarantee the model returns a validated JSON payload rather than free text.
- Subagent orchestration: a lightweight pattern where a coordinator agent issues high-level tool calls that are dispatched to specialized helper functions, each running their own inner `client.messages.create` call.
- Guardrails: checking `usage.input_tokens` and `usage.output_tokens` each step to detect token budget overruns, and stopping the loop when thresholds are exceeded.

**Code samples** (`examples/07-advanced-patterns/`)
- `autonomous-loop.ts` - demonstrates a multi-step `tool_use` loop with a `maxSteps` counter, `stop_reason` dispatch, and clean exit on `end_turn`.
- `extended-thinking.ts` - sends a complex reasoning task with extended thinking enabled (`thinking: { type: "adaptive" }` on current models) and prints the `thinking` block separately from the final `text` block.
- `reflection.ts` - runs a draft-then-critique cycle: the first pass produces an answer, the second pass re-submits it as a `user` message asking for self-critique, and a final pass incorporates the feedback.
- `structured-output.ts` - uses `tool_choice: { type: "tool", name: "emit_result" }` with a strict `input_schema` to extract a typed JSON result from the model with no free-text fallback.
- `error-recovery.ts` - wraps each loop step in try/catch, surfaces tool failures as `is_error: true` `tool_result` blocks, and applies exponential backoff on `Anthropic.RateLimitError`.
- `orchestrator.ts` - implements a coordinator agent that delegates decomposed subtasks to two specialized helper agents via separate `client.messages.create` calls, then merges their results.

**Key APIs and concepts**: `client.messages.create`, `stop_reason` (`tool_use`, `end_turn`, `max_tokens`), `thinking` parameter (`type: "adaptive"` with `output_config.effort`; legacy `type: "enabled"`, `budget_tokens`), `thinking` content block, `tool_use` content block, `tool_result` content block (`is_error`), `tool_choice` (`type: "tool"`, `name`), `input_schema`, `usage` (`input_tokens`, `output_tokens`), `Anthropic.APIError`, `Anthropic.RateLimitError`, `system`

**Prerequisites**: Chapters 5 and 6 are required - this chapter extends the tool-use loop and tool-chaining patterns introduced there. No additional external services are needed; examples are standalone and run with `bun run`.

## Chapter 8: Production and Deployment

Taking an agent from a working prototype to a reliable production service requires confronting a new class of problems: transient API failures, rate limits, runaway costs, and operational blind spots. This chapter covers the Anthropic SDK's built-in resilience primitives - retry logic, timeout configuration, and structured error types - alongside observability patterns that let you trace every request back to a `request-id` and keep cost visible through `usage` fields. You will also make deliberate architectural choices between a long-running process and a serverless deployment, wire up Telegram webhooks for production traffic, and containerize the whole agent with a minimal Bun Dockerfile. By the end, the agent is hardened against the failure modes that kill prototypes in production.

**Learning objectives**
- Handle `Anthropic.APIError`, `RateLimitError`, `APIConnectionError`, and `APITimeoutError` with appropriate retry and fallback logic.
- Implement rate-limit-aware concurrency control with exponential backoff on HTTP 429 responses.
- Instrument every API call with structured logs, `request-id` correlation, and per-request `usage` cost tracking.
- Select the right deployment shape (long-running process vs. serverless) and configure Telegram webhooks for production.
- Containerize the agent with a Bun Dockerfile and manage secrets safely at runtime.

**What it covers**
- The SDK error hierarchy: `Anthropic.APIError` as the base class, and the named subclasses `RateLimitError` (429), `APIConnectionError`, `APITimeoutError` (a subclass of `APIConnectionError`), `AuthenticationError`, and `BadRequestError` - catching each at the right level and deciding whether to retry or surface to the user.
- The SDK's built-in retries: it already retries 408 / 409 / 429 / 5xx with exponential backoff, so avoid double-retrying. The `maxRetries` constructor option tunes this; disable it with `maxRetries: 0` for non-idempotent calls (stateful tool side effects) where a retry would duplicate work.
- The `timeout` option on `client.messages.create` and `client.messages.stream`, set as a per-request override or a client-wide default; a fired timeout raises `APITimeoutError`, including mid-stream.
- Rate limit concurrency control: reading the `x-ratelimit-remaining-requests` and `x-ratelimit-reset-requests` response headers, building a token-bucket or queue-based concurrency limiter, and respecting `retry-after` on 429 responses.
- Observability: extracting the `request-id` via `response._request_id` or `client.messages.withRawResponse.create(...)`, emitting structured log lines that pair `request-id` with `usage.input_tokens`, `usage.output_tokens`, and derived cost, and flagging cache hits via `usage.cache_read_input_tokens`.
- Cost discipline: choosing the right model per task (heavyweight reasoning vs. Haiku-tier triage), applying `cache_control` with `type: "ephemeral"` on stable system prompts and large tool schemas to minimize `usage.input_tokens`, and setting `max_tokens` conservatively to prevent runaway completions.
- Deployment shapes: a long-running Bun process with `bot.startPolling()` vs. a serverless handler receiving Telegram webhook `Update` payloads over HTTPS; tradeoffs in cold-start latency, connection reuse, and streaming compatibility.
- Secrets management: loading `ANTHROPIC_API_KEY` and `TELEGRAM_BOT_TOKEN` from environment variables, never hardcoding them, and a minimal `Dockerfile` using the official Bun base image with a non-root user and `ENV` declarations.

**Code samples** (`examples/08-production/`)
- `error-handling.ts` - catches `RateLimitError`, `APITimeoutError`, `APIConnectionError`, and the `Anthropic.APIError` base class in a single `try/catch` ladder and logs the `request-id` from the response.
- `retry-backoff.ts` - wraps `client.messages.create` with a manual exponential-backoff loop using `maxRetries: 0`, demonstrating when SDK retries should be disabled.
- `concurrency-limiter.ts` - implements a simple async queue that caps in-flight `client.messages.create` calls and drains `x-ratelimit-remaining-requests` headers to throttle dynamically.
- `cost-tracker.ts` - accumulates `usage.input_tokens`, `usage.output_tokens`, and `usage.cache_read_input_tokens` across a multi-turn session and prints a per-turn cost estimate.
- `webhook-server.ts` - minimal Bun HTTP server that receives Telegram `Update` POSTs, validates the secret token header, and dispatches to the agent without `bot.startPolling()`.
- `Dockerfile` - multi-stage Bun container build: installs dependencies, copies source, drops to a non-root user, and passes secrets via environment variables at `docker run` time.

**Key APIs and concepts**: `Anthropic.APIError`, `Anthropic.RateLimitError`, `Anthropic.APIConnectionError`, `Anthropic.APITimeoutError`, `Anthropic.AuthenticationError`, `maxRetries`, `timeout`, `response._request_id`, `client.messages.withRawResponse`, `request-id` header, `usage.input_tokens`, `usage.output_tokens`, `usage.cache_read_input_tokens`, `cache_control`, `max_tokens`, `x-ratelimit-remaining-requests`, `x-ratelimit-reset-requests`, `retry-after`

**Prerequisites**: Chapters 1-7 (especially Chapter 5 for tool calls, where retry idempotency matters most); a Telegram bot token and webhook-accessible HTTPS endpoint for `webhook-server.ts`; Docker installed locally for the Dockerfile sample; all other samples run standalone with `bun run`.

## Chapter 9: Advanced Topics: RAG, Prompt Engineering, and Fine-Tuning

This chapter covers three techniques that close the gap between a working prototype and a production-grade coding agent: retrieval-augmented generation (RAG), systematic prompt engineering, and model customization. RAG lets your agent answer questions grounded in a private codebase or knowledge base by retrieving relevant chunks at query time, rather than cramming everything into a context window. Prompt engineering disciplines - XML structure, few-shot examples, and chain-of-thought - give you reliable control over Claude's output format and reasoning style without touching the model weights. Finally, the chapter is honest about fine-tuning: the Anthropic API does not expose a general fine-tuning endpoint, so you will learn when RAG plus caching is the right call and when Bedrock's limited fine-tuning option for Claude Haiku makes sense.

**Learning objectives**
- Build a complete RAG pipeline that chunks source text, generates embeddings via a third-party provider (for example Voyage AI), stores them in a vector index, and injects retrieved passages into `client.messages.create` calls.
- Use the Citations feature to ground Claude's answers in specific retrieved documents, reducing hallucination.
- Apply prompt engineering best practices - XML tags, role prompts, few-shot examples, chain-of-thought - and measure their effect on output quality.
- Understand token budget and caching tradeoffs (`cache_control`) as a prompting-layer alternative to fine-tuning.
- Make an informed decision about when to pursue fine-tuning (Amazon Bedrock, Claude Haiku) versus when RAG or prompt engineering is sufficient.

**What it covers**
- RAG pipeline steps: document chunking strategy, calling a third-party embeddings API (Anthropic has no embeddings endpoint; Voyage AI is the commonly recommended provider), storing vectors in a local or hosted store, cosine-similarity retrieval, and injecting retrieved chunks into `client.messages.create`.
- Two injection modes, made explicit: plain text injected as `user` content (simple, no citations) vs. `document` content blocks that enable Claude's citation output.
- Citations feature: structuring retrieved docs as `document` content blocks - each with a typed `source` (for example `{ type: "text", media_type: "text/plain", data: "..." }`, or base64 / url / file_id variants) and `citations: { enabled: true }` - so Claude emits citation references tied to source spans. Without `citations: { enabled: true }` no citations are produced; an invalid `source` shape returns a 400.
- Prompt structure best practices: wrapping instructions in XML tags (`<instructions>`, `<context>`, `<examples>`), placing stable guidance in the `system` field, and ordering content to match Claude's attention patterns.
- Few-shot prompting: supplying 2-4 input/output example pairs as prior `user`/`assistant` turns in the `messages` array to steer output format for code-generation tasks.
- Chain-of-thought elicitation: surfacing reasoning either via the top-level `thinking` parameter (adaptive thinking is generally available and needs no beta header) or via explicit scratchpad prompts that ask the model to reason step by step before answering.
- Prompt caching with `cache_control: { type: "ephemeral" }` on large, byte-stable system prompts and retrieved document blocks to cut latency and cost on repeated queries; confirm hits via `usage.cache_read_input_tokens`.
- Model customization landscape: the Anthropic first-party API does not offer general fine-tuning; Amazon Bedrock exposes fine-tuning for select Claude models (for example Claude Haiku); weigh the maintenance and cost of fine-tuning against RAG plus prompt engineering, which covers most use cases.

**Code samples** (`examples/09-advanced-topics/`)
- `rag-pipeline.ts` - chunks a local markdown file, generates embeddings via Voyage AI, retrieves top-k passages by cosine similarity, and injects them as `user` content into `client.messages.create`.
- `citations-demo.ts` - structures retrieved docs as `document` content blocks with a typed `source` and `citations: { enabled: true }`, then prints the citation references Claude returns.
- `prompt-engineering.ts` - compares three prompt variants (bare, XML-tagged with few-shot examples, chain-of-thought) on a code-explanation task and logs the resulting `usage` tokens.
- `cache-large-prompt.ts` - attaches `cache_control` to a large, stable system prompt and a retrieved document block, then inspects `usage.cache_read_input_tokens` across turns to confirm cache hits.
- `finetuning-tradeoffs.ts` - not a training script; demonstrates a RAG-plus-prompt approach that matches a fine-tuning use case and comments on when Bedrock fine-tuning would be warranted instead.

**Key APIs and concepts**: `client.messages.create`, `client.messages.countTokens`, `system` field, `messages` array, `document` content blocks (`source`, `citations: { enabled: true }`), `cache_control: { type: "ephemeral" }`, `usage.cache_creation_input_tokens`, `usage.cache_read_input_tokens`, `thinking` parameter, XML prompt structure, third-party embeddings (Voyage AI), vector similarity retrieval, Amazon Bedrock fine-tuning for Claude Haiku

**Prerequisites**: Chapters 4 (conversation and context management) and 5 (tools) are assumed; a Voyage AI API key is needed for the RAG samples. Anthropic provides neither an embeddings endpoint nor a vector store, so chunking, embedding, and cosine-similarity retrieval are implemented in-sample (or via a named library). All examples otherwise run standalone with `bun run`.

## Chapter 10: Real-World Patterns: Research, Automation, and Support

This chapter applies everything built across the tutorial to three production-grade agent archetypes: a research agent that gathers and synthesizes information across multiple tool calls, an automation agent that executes scheduled or event-triggered workflows, and a customer-support agent that combines retrieval-augmented generation with human escalation. Each archetype reuses the agent-loop runner from Chapter 6 and the Telegram integration from Chapter 3, showing how the same core loop composes into distinct product behaviors. The chapter also covers two cross-cutting concerns every production agent needs: human-in-the-loop approval gates before destructive tool calls, and a lightweight eval harness to measure quality across agent runs over time.

**Learning objectives**
- Compose the Chapter 6 agent-loop runner with domain-specific tool sets to produce working research, automation, and support agents.
- Implement an approval-gate pattern that pauses the `tool_use` / `tool_result` cycle and waits for human confirmation before executing irreversible actions.
- Integrate a RAG retrieval step as a tool call so the support agent can ground answers in a knowledge base without exceeding the context window.
- Build a minimal eval harness that replays recorded conversations and scores agent outputs against expected outcomes using `client.messages.create`.
- Wire all three agents into the Telegram bot so users can trigger each archetype from a single chat interface.

**What it covers**
- Research agent: defining a `web_search` tool with `input_schema` and chaining multiple `tool_use` -> `tool_result` turns to gather sources before a final synthesis pass; controlling iteration depth with a step counter checked on each `stop_reason === "tool_use"` guard.
- Automation agent: triggering the agent loop from a cron or webhook handler, passing task context through the `system` prompt, and using `tool_choice: { type: "any" }` to force an action on the first turn. Because forced `tool_choice` blocks a final `end_turn` text reply, reset it to `auto` on later turns so the loop can terminate.
- Customer-support agent: a `retrieve_docs` tool that fetches top-k chunks from a vector store, an `escalate_to_human` tool that fires a Telegram notification, and a `cache_control` block on the static knowledge-base system prompt to reduce latency and cost across repeated queries.
- Human-in-the-loop approval gate: intercepting a `tool_use` content block before dispatching it, emitting a Telegram inline-keyboard prompt, and either injecting a `tool_result` with the approved output or an error `tool_result` that the agent handles gracefully.
- Safety checks: inspecting `tool_use.name` and `tool_use.input` before execution and short-circuiting with an explanatory `tool_result` when a call looks destructive or out of scope.
- Token budgeting across long runs: reading `usage.input_tokens` and `usage.output_tokens` after each turn and truncating the oldest non-system messages when the running total approaches the model's context limit.
- Eval harness: replaying fixture conversations through `client.messages.create`, extracting structured assertions from the final `text` content block, and logging pass/fail with `usage` metrics to track cost-per-eval.
- Telegram wiring: routing `/research`, `/automate`, and `/support` commands to separate agent instances that each carry their own `messages` history array, while sharing a single bot client.

**Code samples** (`examples/10-real-world/`)
- `research-agent.ts` - multi-step web-search agent that issues up to five `tool_use` turns to collect sources and then synthesizes a cited answer in a final `stop_reason === "end_turn"` response.
- `automation-agent.ts` - cron-triggered agent that forces a first action with `tool_choice: { type: "any" }`, then resets to `auto`, using a `run_task` tool to execute a scheduled job and report results back via Telegram.
- `support-agent.ts` - customer-support agent combining a `retrieve_docs` RAG tool, an `escalate_to_human` tool, and a `cache_control`-tagged system prompt for the static knowledge base.
- `approval-gate.ts` - middleware that intercepts any `tool_use` block whose name matches a destructive-action list, sends a Telegram inline-keyboard confirmation, and resumes or cancels the agent loop based on the user reply.
- `eval-harness.ts` - fixture-driven eval runner that replays saved conversation pairs through `client.messages.create` and scores tool selection and final answer quality, emitting a pass-rate and average `usage.output_tokens` per test case.
- `telegram-all-agents.ts` - unified Telegram bot entry point that routes commands to the research, automation, and support agents and shares the approval-gate middleware across all three.

**Key APIs and concepts**: `client.messages.create`, `client.messages.stream`, `stop_reason`, `tool_use` content block, `tool_result` content block, `tool_choice` (`auto` / `any` / `tool`), `input_schema`, `usage.input_tokens`, `usage.output_tokens`, `cache_control`, `system`, `tools`, `Anthropic.APIError`, multi-turn `messages` array, RAG retrieval tool pattern, human-in-the-loop gate, eval harness

**Prerequisites**: Chapter 6 agent-loop runner and tool-chaining patterns; Chapter 3 Telegram bot client and command routing; Chapter 4 conversation history management; Chapter 9 RAG and prompt-engineering concepts; a vector store or document index available for the support agent's `retrieve_docs` tool.
