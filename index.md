---
layout: home

hero:
  name: Build Your Own Coding Agent
  text: With the Anthropic SDK, TypeScript, and Bun
  tagline: From your first API request to a streaming, tool-using agent on the terminal and Telegram.
  actions:
    - theme: brand
      text: Start with Chapter 1
      link: /chapters/01-sdk-first-request
    - theme: alt
      text: View the outline
      link: https://github.com/yagop/coding-agents-tutorial/blob/main/OUTLINE.md

features:
  - title: Standalone, runnable examples
    details: Every chapter ships single-file examples under examples/NN-slug/ that you run directly with `bun run` - no build step, no boilerplate.
  - title: Real SDK surface only
    details: Samples use only the official @anthropic-ai/sdk - client.messages.create, content blocks, streaming, tools - never invented methods.
  - title: Bun + TypeScript
    details: TypeScript runs natively on Bun. The same code targets Anthropic direct or any Anthropic-compatible gateway via ANTHROPIC_BASE_URL.
---
