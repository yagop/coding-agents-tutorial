# Context and Conversation Management

🧠 Your bot from Chapter 3 already remembers a conversation - but only because you happened to keep one `messages` array alive in a single process. Pull the plug and the memory is gone; open a second chat and the two talk over each other. The reason is worth saying plainly: the Messages API is *stateless*. Every `client.messages.create` call must carry the entire conversation with it, because the server keeps nothing between requests. So the memory has to live in your code, and this chapter is about holding it well - across turns, across the model's context-window ceiling, across users, and across restarts.

You already have `new Anthropic()`, the env vars, and content-block narrowing from Chapter 1, plus the REPL loop and Telegram token from Chapter 3, so here you only add the stateful layer on top. As always the key comes from the environment - never hardcode it - and Bun auto-loads `.env`, so there is nothing to import.

## History and the system prompt

The shape of memory is a list of turns: a `messages` array of `Anthropic.MessageParam`, strictly alternating `role: 'user'` and `role: 'assistant'`, where each `content` is a string or an array of content blocks (`text`, `tool_use`, `tool_result`). The one rule that keeps it valid is alternation, and the one move that maintains it is this: after each call, push `response.content` straight back as an `assistant` turn before you add the next `user` message.

<<< @/examples/04-context/multi-turn.ts

Notice that the assistant turn is `response.content` *unchanged* - the same block array the model returned - so the next call sees the full, faithful history. The printed turn count climbs by two each round, one `user` and one `assistant`, which is the alternation made visible. Run the first sample to watch it grow:

```sh
bun run examples/04-context/multi-turn.ts
```

Persona and standing instructions do not belong in a turn - they belong in `system`, which sits outside the alternation and is sent with every request. You can pass `system` as a plain string or as an array of `text` blocks; the array form is what you will want the moment caching enters the picture.

<<< @/examples/04-context/system-prompt.ts

The same `system` rides along on both turns, so the persona holds without you ever restating it inside a `user` message. String or block array, the model reads them identically - the array just gives you a place to attach `cache_control` later.

## Counting tokens and trimming

Here is the wall you will eventually hit: every model has a finite context window, and a conversation that runs long enough will overflow it. You get ahead of that by measuring before you send. `client.messages.countTokens` takes the same `model`, `system`, `messages`, and `tools` you are about to pass to `create`, and returns the input-token count - so you can branch *before* spending a request.

<<< @/examples/04-context/token-counter.ts

The threshold is paired with the model from `client.models.retrieve` rather than a bare number hard-coded in, because a window that is generous on one tier is tight on another. When the count crosses it, a rolling window keeps only the last N turns and drops the rest.

::: warning Trim in pairs, never one side alone
Every trim must remove a `user` and its `assistant` reply *together*. Drop one side and you break alternation - two `user` turns in a row, or an `assistant` with nothing before it - and the next `create` call rejects the whole array. The window slides by two, always.
:::

A rolling window is cheap but forgetful: it throws away the early turns wholesale. When those early turns still matter, summarize instead. You call `create` once with a summarize instruction over the old turns, then replace that whole stretch with a single injected `user`/`assistant` pair carrying the summary - history compressed, alternation intact.

<<< @/examples/04-context/summarize-history.ts

The injected pair *is* the new beginning of `messages`: one short `user` turn that asks for the state of things, one `assistant` turn that holds the summary. Everything before it is gone, but its meaning rides forward in far fewer tokens.

## Prompt caching

When a large, stable chunk of context rides along on every request - a long system prompt, a file you keep referencing - you are paying to re-process the same tokens each time. Prompt caching fixes that: add `cache_control: { type: 'ephemeral' }` to the final `text` block of your `system` array (or to a large stable `user` turn), and the model caches everything up to that point. Later requests that share the prefix read it from cache instead of reprocessing it, which cuts both latency and cost.

<<< @/examples/04-context/prompt-cache.ts

The first request reports `cache_creation_input_tokens` as it writes the cache; the second, identical request reports a non-zero `cache_read_input_tokens` - the prefix served from cache, paid for once. Two conditions make or break this:

| Requirement | Detail |
| --- | --- |
| Minimum size | The cached prefix must exceed the model's floor: ~4096 tokens on Opus 4.x and Haiku 4.5, ~2048 on Sonnet 4.6. Smaller prefixes are never cached. |
| Byte-stability | The prefix must be byte-for-byte identical across requests. Slip a changing value - a timestamp, a counter - into the cached block and it silently no-ops, charging full price with no warning. |

::: tip Verify, don't trust
Caching fails quietly, so always confirm it by reading `usage.cache_read_input_tokens` on the second request. Zero where you expected a hit means your prefix changed or fell under the minimum.
:::

## Per-user sessions that survive restarts

Now back to the bot, with everything above in hand. One process serves many chats, so one shared `messages` array will not do - each Telegram `chat.id` needs its own history. You key an in-memory `Map` by `chat.id`, and to outlast a restart you serialize that `Map` to a JSON file and load it back on startup.

<<< @/examples/04-context/telegram-sessions.ts

Each chat's `Anthropic.MessageParam[]` lives under its own key, so two people never bleed into each other's context. Writing `sessions.json` after each turn means a crash or a redeploy costs you nothing - the histories are read back the next time the bot wakes, exactly where they left off.

What's next: Chapter 5 - Implementing Tools and Function Calling.
