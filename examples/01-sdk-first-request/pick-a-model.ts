// bun run examples/01-sdk-first-request/pick-a-model.ts
//
// Send the SAME prompt to three models - one from each tier - and print, for
// each, the model id, the first text block of the response, and the token
// counts (usage.input_tokens / usage.output_tokens). Running them side by side
// lets you compare answer quality against token cost across the tiers:
//
//   claude-opus-4-8   - most capable
//   claude-sonnet-4-6 - balance of speed and intelligence
//   claude-haiku-4-5  - fastest and cheapest
//
// Prerequisite: export ANTHROPIC_API_KEY in your environment (Bun auto-loads a
// .env file). new Anthropic() reads the key from there - never hardcode it.

import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

// Anthropic.Model is the SDK's union of valid model id strings, so a typo here
// is a compile-time error rather than a 404 at runtime.
const models: Anthropic.Model[] = [
  "claude-opus-4-8",
  "claude-sonnet-4-6",
  "claude-haiku-4-5",
];

const prompt = "In one sentence, explain what a coding agent is.";

for (const model of models) {
  const message = await client.messages.create({
    model,
    // max_tokens is an UPPER BOUND on the response length, not a target. The
    // model stops when it is done (stop_reason "end_turn"); it does not pad the
    // answer to reach this number. It only matters as a ceiling - if the reply
    // would exceed it, generation is cut off (stop_reason "max_tokens").
    max_tokens: 256,
    messages: [{ role: "user", content: prompt }],
  });

  // message.content is an array of content blocks (a discriminated union).
  // Narrow on block.type === "text" before reading block.text.
  const firstText = message.content.find(
    (block): block is Anthropic.TextBlock => block.type === "text",
  );

  console.log(`\n=== ${model} ===`);
  console.log(firstText ? firstText.text : "(no text block in response)");
  console.log(
    `tokens: input=${message.usage.input_tokens} output=${message.usage.output_tokens}`,
  );
}
