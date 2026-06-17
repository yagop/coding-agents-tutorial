# Handling User Requests: REPL and Telegram Bot

💬 So far each script asked Claude one fixed question and exited. Now you'll hand the keyboard to a real person. A coding agent is, at heart, a loop: read input, build messages, call Claude, emit output, repeat. The Claude call stays the same; only the I/O around it changes - so in this chapter you wrap that one call in two different frontends, a terminal REPL and a Telegram bot.

```text
  read input → build messages → call Claude → emit output → repeat
                                │
                                ▼
                                stop_reason 'end_turn' ends the turn
```

You already have `new Anthropic()`, the env vars, and the content-array narrowing from Chapter 1, plus `stream()`, `.on('text')`, and `finalMessage()` from Chapter 2. Here you only add the input/output plumbing. The one new env var is `TELEGRAM_BOT_TOKEN`, which lives in `.env` next to your Anthropic credentials - Bun auto-loads it, and as always the key comes from the environment; never hardcode it.

## The terminal REPL

The friendliest place to start is your own terminal. Bun exposes stdin as an async iterable, so `for await (const line of console)` reads one line per turn with no `readline` import. You keep a `messages: Anthropic.MessageParam[]` array, push each `user` line and each `assistant` reply onto it, and the model sees the whole session as context.

<<< @/examples/03-repl-telegram/repl.ts

Notice the two pushes per turn - `{ role: 'user', content: line }` before the call, `{ role: 'assistant', content: replyText }` after - and the `type === 'text'` narrowing on the first content block. Run it and chat:

```sh
bun run examples/03-repl-telegram/repl.ts
```

The reply only appears once Claude has finished the whole answer. Swap `create` for `stream` and the same loop prints tokens as they land - the `.on('text', ...)` and `finalMessage()` you met in Chapter 2:

<<< @/examples/03-repl-telegram/repl-stream.ts

The assistant text you push back onto `messages` comes from `final.content`, narrowed to its first text block, so the next turn carries the full reply as context.

## Talking to Telegram

Let's put the same loop in front of the world. First, message [@BotFather](https://t.me/BotFather) on Telegram, send `/newbot`, and it hands you a token - drop that into `.env` as `TELEGRAM_BOT_TOKEN`. The Bot API is plain HTTP: you POST JSON to `https://api.telegram.org/bot<token>/<method>` with raw `fetch`, no third-party library.

How do updates reach you? Two ways: **polling**, where you long-poll `getUpdates` and Telegram holds the request open until a message arrives, and **webhooks**, where Telegram POSTs to a public URL of yours. Polling needs nothing but an outbound connection, so it's what you'll use here.

::: details Going deeper: webhooks
Webhooks flip the direction - Telegram calls you - which is more efficient at scale but needs a public HTTPS endpoint (a deployed server or a tunnel). The handler logic is identical; only the transport differs. See the Telegram Bot API docs for `setWebhook` when you deploy.
:::

Each `getUpdates` call returns an array of updates; you pull `message.chat.id` and `message.text`, ask Claude, and `sendMessage` the first text block back. Bumping `offset` to `update_id + 1` acks the batch so you never re-read it.

<<< @/examples/03-repl-telegram/telegram-bot.ts

Minimal `type`s describe just the fields you read off each `Update` and response - no `unknown` anywhere. The long `timeout: 30` is the long-poll: the request blocks for up to 30 seconds rather than hammering Telegram in a tight loop.

## Streaming into a live-edited message

Here's the fun part: a Telegram message can be *edited*, so you can stream Claude's reply into one growing bubble. You `sendMessage` a placeholder to get a `message_id`, then call `editMessageText` as deltas arrive.

::: warning The headline gotcha: throttle your edits
Editing once per streamed token trips Telegram's flood limit almost instantly. Batch the deltas and edit **at most about once per second** (track the last-edit time), plus one final edit with the complete text. Two responses you must handle: a `400` whose description says *message is not modified* (the text didn't change - ignore it), and a `429` carrying `parameters.retry_after` (wait that many seconds, then retry).
:::

<<< @/examples/03-repl-telegram/telegram-stream.ts

The edit fires only when at least a second has passed since the last one, and the final edit after the stream guarantees the message ends complete even if the last batch was throttled.

::: info Verifying the bots
The Telegram bots are long-running and need a real `TELEGRAM_BOT_TOKEN`, so this repo typechecks and reviews them rather than running them end to end. The REPLs you can run right now.
:::

## One guard for both frontends

Both frontends face the same messy input, so they share a few pure helpers. You skip empty or whitespace-only lines, answer `/start` and `/help` locally before spending an API call, and split any reply over Telegram's 4096-character limit into chunks.

<<< @/examples/03-repl-telegram/input-guard.ts

`isBlank`, `handleCommand`, and `chunk` are network-free and independently testable - the file runs standalone and prints each on sample inputs. Wire them in ahead of every Claude call and your loop stays calm under real-world input.

What's next: Chapter 4 - Context and Conversation Management.
