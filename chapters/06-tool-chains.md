# Building Tool Chains and Complex Workflows

🔁 In Chapter 5 you ran a single tool round-trip: one call, one result, one answer. Real work rarely fits in one exchange - the model looks something up, reads the result, decides it needs one more thing, and only then writes its reply. This chapter turns that single round-trip into an *engine*: a loop that keeps calling `client.messages.create` until the model is finally done. Get this loop right and everything else - sequential chains, parallel calls, a reusable runner - is just a variation on it.

You already have tools, `tool_use`/`tool_result`, and content-block narrowing from Chapter 5, so here you only add the loop around them. As always the key comes from the environment - never hardcode it - and Bun auto-loads `.env`.

## The agent loop

The engine is smaller than you expect: call the model, then branch on `stop_reason`. If it is `end_turn`, the model is done - print the text and stop. If it is `tool_use`, run the requested tools, feed the results back, and call again. The one rule a beginner cannot guess from the types: append the model's entire `response.content` as the assistant turn *before* you add any `tool_result`, so every `tool_use` block is answered exactly once.

<<< @/examples/06-tool-chains/agent-loop.ts

Run it and watch the loop turn over more than once - the model asks about Paris and Oslo, reads both, then answers:

```sh
bun run examples/06-tool-chains/agent-loop.ts
```

The loop exits on `stop_reason !== 'tool_use'`; `end_turn` is the everyday case, and you will meet `max_tokens` and `pause_turn` when a later chapter needs them.

## Chaining and parallel calls

Two shapes of multi-tool work fall out of the same loop. A **sequential chain** is when one tool's output is the next tool's input - look up an id, then fetch something for that id. You do not orchestrate this yourself: the model calls the first tool, reads the result on the next turn, and only then calls the second.

<<< @/examples/06-tool-chains/sequential-chain.ts

The model serializes the dependent calls on its own - `find_user` returns `u_42`, and only the following turn calls `get_balance` with it.

When calls are *independent*, the model often asks for them all in one turn - several `tool_use` blocks at once. Filter them with `b.type === 'tool_use'` and resolve them together with `Promise.all`, returning one `tool_result` per block.

<<< @/examples/06-tool-chains/parallel-tools.ts

Independent results all ride back in a single `user` turn, so the model gets the whole batch at once. The rule of thumb: return what you can in parallel, and let the model serialize whatever genuinely depends on an earlier answer.

## Steering the loop with tool_choice

`tool_choice` decides whether - and which - tool the model must call, and it touches your loop in one sharp way. With `auto` the model picks; with `none` it may not call a tool at all; with `any` or `{ type: 'tool', name }` it is *forced* to call one.

<<< @/examples/06-tool-chains/tool-choice.ts

The gotcha worth a warning: a forced tool call comes back as `stop_reason: 'tool_use'`, never `end_turn` on that turn.

::: warning Forcing and termination
Because `{ type: 'any' }` and `{ type: 'tool', name }` guarantee a `tool_use` turn, the model can never say "I'm done" while a tool is forced. Keep the loop's exit condition on `end_turn`, and only force on the turns where you actually want a call - force every iteration and the loop runs forever.
:::

## A reusable runner

Everything so far has been one-off scripts. Lift the loop into a function and it becomes a runner you can drop in front of any input: pass the `messages`, the `Anthropic.Tool[]`, and a `Map` from tool name to handler, plus a `maxIterations` cap so a misbehaving model can never spin forever, and `is_error: true` whenever a handler is missing or throws.

<<< @/examples/06-tool-chains/agent-runner.ts

The handler `Map` is the only thing that grows per app; the loop, the cap, and the error handling stay put. This is the same runner you would wire to the Telegram bot from Chapter 3.

Because the body is just the loop, you can swap `create` for `stream` plus `finalMessage()` to surface the model's text as it arrives - the tool round-trips happen quietly in between.

<<< @/examples/06-tool-chains/runner-with-stream.ts

`finalMessage()` hands back the same assembled `Message` - `stop_reason`, `content`, and all - so the loop logic is unchanged; only the output went live.

::: details Going deeper: betaZodTool and toolRunner
Once you have written the loop by hand, the SDK's `client.beta.messages.toolRunner` is a thin wrapper over exactly this shape - it runs the create / tool / result cycle for you. Pair it with `betaZodTool` (from `@anthropic-ai/sdk/helpers/beta/zod`) to define a tool from a Zod schema and receive a typed `input` instead of casting. Reach for it once the hand-written loop feels obvious; until then, the loop above is the version whose behavior you can actually see.
:::

What's next: Chapter 7 - Advanced Agent Patterns.
