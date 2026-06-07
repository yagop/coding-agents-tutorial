// bun run examples/01-sdk-first-request/custom-base-url.ts
//
// Point the SAME code at an Anthropic-compatible gateway by changing one env var.
// The SDK speaks the Messages API protocol (POST /v1/messages) against whatever
// base URL it is given, so any gateway that implements that protocol works.
//
// Concrete Anthropic-compatible endpoints you can set ANTHROPIC_BASE_URL to:
//   - Anthropic direct:  https://api.anthropic.com   (the default)
//   - MiniMax:           https://api.minimax.io/anthropic/v1
//   - Z.ai:              https://api.z.ai/api/anthropic
//
// Use the API key that matches the endpoint you point at: ANTHROPIC_API_KEY must
// be a key for whichever gateway ANTHROPIC_BASE_URL names (an Anthropic key for
// Anthropic direct, a MiniMax key for MiniMax, and so on). On a gateway, set MODEL
// to whatever model name that provider exposes - the `model` field accepts any
// string, so custom gateway model names are fine.
//
// Run against a gateway:
//   ANTHROPIC_BASE_URL=https://api.z.ai/api/anthropic \
//   ANTHROPIC_API_KEY=your-gateway-key \
//   MODEL=glm-4.6 \
//   bun run examples/01-sdk-first-request/custom-base-url.ts

import Anthropic from "@anthropic-ai/sdk";

// new Anthropic() with NO arguments already auto-reads ANTHROPIC_BASE_URL (and
// ANTHROPIC_API_KEY) from process.env, falling back to https://api.anthropic.com
// when ANTHROPIC_BASE_URL is unset. That means the same `new Anthropic()` runs
// against Anthropic direct or a compatible gateway purely by changing the env var.
//
// Here we pass baseURL and apiKey explicitly to make the source visible; this is
// equivalent to the env-driven default. Swap either constructor freely:
//
//   const client = new Anthropic();                       // env-driven (implicit)
//   const client = new Anthropic({ baseURL, apiKey });    // explicit (below)
const baseURL = process.env.ANTHROPIC_BASE_URL ?? "https://api.anthropic.com";

const client = new Anthropic({
  baseURL,
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const message = await client.messages.create({
  // On a compatible gateway, use whatever model name that provider exposes.
  model: process.env.MODEL ?? "claude-sonnet-4-6",
  max_tokens: 128,
  messages: [{ role: "user", content: "Say hello in five words." }],
});

// content is an array of content blocks; narrow on type === "text" before
// reading block.text. The same response shape comes back from any compatible
// gateway, so this code is identical no matter where ANTHROPIC_BASE_URL points.
const first = message.content[0];
if (first?.type === "text") {
  console.log(first.text);
} else {
  console.log("(no text block in the first content block)");
}
