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

Each chapter's detailed spec lives in its GitHub issue (linked below). Published chapters are written to `chapters/NN-slug.md` and rendered on the site.

1. [The Claude SDK and Your First API Request](https://github.com/yagop/coding-agents-tutorial/issues/1)
2. [Streaming Responses and Message Types](https://github.com/yagop/coding-agents-tutorial/issues/2)
3. [Handling User Requests: REPL and Telegram Bot](https://github.com/yagop/coding-agents-tutorial/issues/3)
4. [Context and Conversation Management](https://github.com/yagop/coding-agents-tutorial/issues/4)
5. [Implementing Tools and Function Calling](https://github.com/yagop/coding-agents-tutorial/issues/5)
6. [Building Tool Chains and Complex Workflows](https://github.com/yagop/coding-agents-tutorial/issues/6)
7. [Advanced Agent Patterns](https://github.com/yagop/coding-agents-tutorial/issues/7)
8. [Production and Deployment](https://github.com/yagop/coding-agents-tutorial/issues/8)
9. [Advanced Topics: RAG, Prompt Engineering, and Fine-Tuning](https://github.com/yagop/coding-agents-tutorial/issues/9)
10. [Real-World Patterns: Research, Automation, and Support](https://github.com/yagop/coding-agents-tutorial/issues/10)

The README is tracked by [issue #11](https://github.com/yagop/coding-agents-tutorial/issues/11).
