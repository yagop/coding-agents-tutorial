# Streaming Responses and Message Types

⚡ In Chapter 1 every call was a blocking round trip: you waited for the whole `Message`, then printed it. That is fine for a one-liner, but the moment your agent explains code or reasons through several steps, a reader stares at a blank terminal for seconds. In this chapter you flip that around - tokens appear the instant the model produces them, so your agent feels alive.

You already have `new Anthropic()`, the env vars, and the content-is-an-array narrowing from Chapter 1, so here you only add the streaming surface on top.

## Streaming the easy way: messages.stream()

A blocking `create()` resolves once, at the end; streaming surfaces text as it is generated, which collapses *time-to-first-token* - how long the reader waits before seeing anything. `client.messages.stream()` is your primary entry point: it takes the same body as `create()` (minus `stream: true`) and returns a `MessageStream` that emits typed events and assembles the reply for you. The friendliest helper is `.on('text', ...)`:

<<< @/examples/02-streaming/basic-stream.ts

Awaiting `finalMessage()` at the end keeps the program alive until the stream closes - without it the script could exit mid-answer. (As always, `new Anthropic()` pulls auth from the environment; never hardcode your key.)

::: info Bun auto-loads `.env`
These files read `ANTHROPIC_DEFAULT_SONNET_MODEL` straight from the environment - Bun loads your `.env` at startup, so there is nothing to import or configure here.
:::

When you want the live chunks and the finished result together, await the assembled message once the stream ends:

<<< @/examples/02-streaming/final-message.ts

The streaming and blocking paths converge on one shape: a fully typed `Anthropic.Message` with `content`, `stop_reason`, and `usage`.

## The SSE event sequence underneath

`stream()` is a wrapper over Server-Sent Events. Dropping to the low-level path - `create({ stream: true })` - returns a `Stream<Anthropic.RawMessageStreamEvent>` you can `for await` over, one raw SSE event at a time. The events always arrive in this order:

```text
  message_start          usage.input_tokens
      |
      v
  content_block_start    index, type (e.g. text)
      |
      v
  content_block_delta    text_delta / input_json_delta   (repeats)
      |
      v
  content_block_stop     index
      |
      v
  message_delta          stop_reason + usage.output_tokens
      |
      v
  message_stop
```

| event | what it carries |
|---|---|
| `message_start` | the opening `Message`, including `usage.input_tokens` |
| `content_block_start` | a block's `index` and `type` |
| `content_block_delta` | one `text_delta` (or `input_json_delta`) for that block |
| `content_block_stop` | the `index` of the block that just finished |
| `message_delta` | `stop_reason` and the cumulative `usage.output_tokens` |
| `message_stop` | the stream is done |

You branch this discriminated union on `event.type`:

<<< @/examples/02-streaming/raw-stream.ts

Run it and you will see one `content_block_start`, a burst of `content_block_delta`s, then the closing events - the lifecycle of a single block from open to close.

::: warning The gotcha that breaks token accounting
`usage.output_tokens` and `stop_reason` live on **`message_delta`**, NOT on `message_stop`. `message_stop` is an empty signal. If you wait for `message_stop` to read your output-token count, you get nothing - read it off `message_delta`, and grab `input_tokens` from `message_start`.
:::

That is exactly what a token summary leans on - input from `message_start`, output from `message_delta`:

<<< @/examples/02-streaming/token-usage.ts

A `content_block_delta` carries a `text_delta` (plain text, your focus here) or an `input_json_delta` (streamed tool-call JSON). Two more block types - `tool_use` and `thinking` - ride this same lifecycle but are deferred to Chapters 5 and 7; here, every delta you read is text.

## Accumulating deltas for a custom renderer

If you are not using `.on('text', ...)` - maybe you are feeding a UI, a buffer, or a Telegram edit loop - you accumulate the answer yourself by concatenating `text` across the `content_block_delta` events:

<<< @/examples/02-streaming/manual-delta.ts

The one rule: narrow `event.delta.type === 'text_delta'` before reading `event.delta.text`, so non-text deltas never sneak into your string. That `text` variable is now yours to render however you like.

::: details Going deeper: smoother custom renderers
Raw deltas can arrive mid-word or mid-line. Real renderers often buffer until a word or sentence boundary, throttle redraws to a frame budget, or debounce remote edits (a Telegram bot, for instance, should not call `editMessageText` on every token). The `.on('text', (delta, snapshot) => ...)` helper also hands you the full snapshot so far, so you can re-render from a clean string instead of stitching deltas yourself.
:::

What's next: Chapter 3 - Handling User Requests: REPL and Telegram Bot.
