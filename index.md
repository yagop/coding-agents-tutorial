---
layout: home

hero:
  name: Build Your Own Coding Agent
  text: With the Anthropic SDK, TypeScript, and Bun
  tagline: From your first API request to a streaming, tool-using agent on the terminal and Telegram.
  actions:
    - theme: brand
      text: Read the outline
      link: https://github.com/yagop/coding-agents-tutorial/blob/main/OUTLINE.md
    - theme: alt
      text: View on GitHub
      link: https://github.com/yagop/coding-agents-tutorial

features:
  - title: Standalone, runnable examples
    details: Every chapter ships single-file examples under examples/NN-slug/ that you run directly with `bun run` - no build step.
  - title: Real SDK surface only
    details: Samples use only the official @anthropic-ai/sdk - client.messages.create, content blocks, streaming, tools - never invented methods.
  - title: Anthropic direct or any gateway
    details: The same code targets Anthropic direct or an Anthropic-compatible gateway (Bedrock, Vertex, or a custom ANTHROPIC_BASE_URL) - just change one env var.
---
