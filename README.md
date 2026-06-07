# coding-agents-tutorial

A 10-chapter, hands-on tutorial on building your own coding agent with the Anthropic SDK (TypeScript + Bun).

Published with VitePress at https://yagop.github.io/coding-agents-tutorial/. Each chapter is self-contained and ships standalone, runnable examples under `examples/NN-slug/`. Run any example directly with `bun run`. See [OUTLINE.md](OUTLINE.md) for the full chapter plan.

## Chapters

1. [The Claude SDK and Your First API Request](chapters/01-sdk-first-request.md)

More chapters are tracked as issues and land here as they are written.

## Getting started

```
bun install
echo 'ANTHROPIC_API_KEY=sk-ant-...' > .env
bun run examples/01-sdk-first-request/hello.ts
```
