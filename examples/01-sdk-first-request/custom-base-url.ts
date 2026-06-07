// bun run examples/01-sdk-first-request/custom-base-url.ts
//
// Point the SAME code at any Anthropic-compatible gateway by changing one env var.
//
// The Anthropic SDK talks to whatever `baseURL` you give it. As long as the
// endpoint speaks the Messages API (POST /v1/messages, x-api-key,
// anthropic-version), the rest of your program - every `client.messages.create`
// call - stays byte-for-byte identical. Only construction changes.
//
// Concrete Anthropic-compatible endpoints you can set ANTHROPIC_BASE_URL to:
//   - Anthropic direct (default): https://api.anthropic.com
//   - MiniMax:                    https://api.minimax.io/anthropic/v1
//   - z.ai:                       https://api.z.ai/api/anthropic
// Each gateway issues its own API key - put that key in ANTHROPIC_API_KEY, and
// pick a model the gateway serves via MODEL (gateway model names are just
// strings, so anything the provider exposes works).
//
// Two ways to target a gateway:
//
//   1. Explicit (this file): pass baseURL/apiKey to the constructor. Reading
//      them from the environment with a `??` default keeps secrets and the URL
//      out of the source while making the wiring obvious.
//
//   2. Zero-config: `new Anthropic()` with NO args ALSO auto-reads
//      ANTHROPIC_BASE_URL (and ANTHROPIC_API_KEY) from the environment. So the
//      same code runs against Anthropic direct or a compatible gateway just by
//      changing the env var - set ANTHROPIC_BASE_URL to switch, unset it to go
//      back to Anthropic direct. No code edit, no redeploy of logic.
//
// Run it (Bun auto-loads .env, so exporting these in .env is enough):
//   ANTHROPIC_BASE_URL=https://api.z.ai/api/anthropic \
//   ANTHROPIC_API_KEY=your-gateway-key \
//   MODEL=glm-4.6 \
//   bun run examples/01-sdk-first-request/custom-base-url.ts

import Anthropic from '@anthropic-ai/sdk'

// Explicit construction. The `?? 'https://api.anthropic.com'` default means
// this runs against Anthropic direct when ANTHROPIC_BASE_URL is unset, and
// against the gateway the moment you set it. `new Anthropic()` (no args) would
// read both of these from the environment on its own - this form just makes the
// source of each value visible.
const client = new Anthropic({
  baseURL: process.env.ANTHROPIC_BASE_URL ?? 'https://api.anthropic.com',
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// claude-sonnet-4-6 is the default; override with MODEL for whatever the
// configured gateway serves (e.g. a MiniMax or z.ai model name). Anthropic.Model
// includes `(string & {})`, so a plain string assigns to it - no cast needed.
const model: Anthropic.Model = process.env.MODEL ?? 'claude-sonnet-4-6'

const message: Anthropic.Message = await client.messages.create({
  model,
  max_tokens: 256,
  messages: [
    { role: 'user', content: 'In one sentence, what is an Anthropic-compatible API gateway?' },
  ],
})

console.log(`baseURL: ${client.baseURL}`)
console.log(`model:   ${model}`)

// `content` is an array of blocks; narrow on `type === 'text'` before reading
// `.text`. Print the first text block.
const firstText = message.content.find(
  (block): block is Anthropic.TextBlock => block.type === 'text',
)
console.log(firstText?.text ?? '(no text block in response)')
