# Advanced Agent Patterns

🧠 Chapters 5 and 6 gave you a loop that calls tools until the model is done. That loop is the skeleton; this chapter adds the muscles - a step budget so it can never run away, extended thinking so it reasons before it acts, self-critique so it catches its own mistakes, structured output you can parse, error recovery, and a coordinator that hands work to helper agents. Each pattern is a small, independent addition to the loop you already know.

You already have the tool round-trip and the agent loop from Chapters 5 and 6, so here you only add patterns on top. As always the key comes from the environment - never hardcode it - and Bun auto-loads `.env`.

## The autonomous loop

An autonomous agent is the loop with a leash. You accumulate `messages`, branch on `stop_reason`, and - the part beginners skip - cap the number of steps so a confused model can never spin forever. Track `usage` as you go, so you can see what each run costs.

<<< @/examples/07-advanced-patterns/autonomous-loop.ts

Run it and watch the step count and running token total print each iteration:

```sh
bun run examples/07-advanced-patterns/autonomous-loop.ts
```

The loop exits two ways: cleanly on `end_turn`, or defensively when `maxSteps` is hit - never trusting the model to stop on its own.

::: details Going deeper: token guardrails
That running `totalTokens` is the hook for a hard budget. Read `usage.input_tokens` and `usage.output_tokens` after each step and `break` once a threshold is crossed - a runaway agent costs money one step at a time, and inside the loop is the only place to catch it.
:::

## Thinking and reflecting

Sometimes you want the model to reason before it answers. Extended thinking turns that reasoning into its own `thinking` content block you can read, separate from the final text - and those thinking tokens count toward `usage`.

<<< @/examples/07-advanced-patterns/extended-thinking.ts

You enable it with `thinking: { type: 'adaptive' }`, then narrow on `block.type === 'thinking'` to read `block.thinking`.

::: info Older models
`adaptive` is the current shape. On models 4.6 and earlier, use `thinking: { type: 'enabled', budget_tokens: N }` instead (at least 1024, and below `max_tokens`).
:::

A cheaper kind of reasoning is to let the model grade its own work. After it writes a draft, you ask it to critique and revise - but the critique must go back as a plain `user` turn, never as a fabricated `tool_result`.

<<< @/examples/07-advanced-patterns/reflection.ts

The draft is appended verbatim as the assistant turn, and the critique request is an ordinary `user` message - so the model treats it as feedback to act on, not as a tool's output.

## Structured output and recovering from errors

When you need machine-readable output instead of prose, give the model one tool and force it with `tool_choice` - it must call the tool, so its `input` becomes your typed result.

<<< @/examples/07-advanced-patterns/structured-output.ts

The `enum` and `required` fields pin the shape; you read `block.input` as your own type and skip parsing free text entirely.

Real agents also hit failures - a rate limit, a tool that throws. Retry transient API errors with backoff, and turn tool failures into `tool_result` blocks with `is_error: true` so the model can adapt instead of crashing.

<<< @/examples/07-advanced-patterns/error-recovery.ts

`Anthropic.RateLimitError` gets exponential backoff; a thrown tool becomes an error result the model reads and works around - here it reports the missing file instead of stalling.

## Orchestrating subagents

For bigger jobs, one agent becomes a coordinator: it holds the high-level tools, and each tool call is dispatched to a helper that runs its own `client.messages.create` with a narrow job and its own context.

<<< @/examples/07-advanced-patterns/orchestrator.ts

The coordinator never sees the subagent's internal turns - only its final result comes back as a `tool_result`, which keeps each context small and focused.

::: details Going deeper: a planning tool
A common first move for a coordinator is a dedicated `make_plan` tool that returns an explicit task list. The loop then iterates those subtasks on following turns, dispatching each to a helper - so planning and doing become separate, inspectable steps.
:::

What's next: Chapter 8 - Production and Deployment.
