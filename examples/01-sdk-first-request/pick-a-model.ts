// bun run examples/01-sdk-first-request/pick-a-model.ts
//
// Send the SAME prompt to three models - one per tier - so you can compare
// answer quality against token cost side by side:
//
//   claude-opus-4-8   most capable        (highest $/token)
//   claude-sonnet-4-6 speed / intelligence balance
//   claude-haiku-4-5  fastest / cheapest  (lowest $/token)
//
// For each model we print the model id, the first text block of the reply, and
// usage.input_tokens / usage.output_tokens. Run it and watch how the answers
// converge while the per-call token cost drops as you move down the tiers.
//
// Prerequisite: export ANTHROPIC_API_KEY in your environment (Bun auto-loads a
// .env file). new Anthropic() reads the key from there - never hardcode it.

import Anthropic from "@anthropic-ai/sdk";

// Reads ANTHROPIC_API_KEY (and ANTHROPIC_BASE_URL, if set) from the environment.
const client = new Anthropic();

// Typed as Anthropic.Model[] so the model ids are checked against the SDK's
// known model strings. The same prompt goes to every one of them.
const models: Anthropic.Model[] = [
  "claude-opus-4-8",
  "claude-sonnet-4-6",
  "claude-haiku-4-5",
];

const prompt = "In one sentence, what is a coding agent?";

for (const model of models) {
  const message = await client.messages.create({
    model,
    // max_tokens is an UPPER BOUND on the response, not a target length. The
    // model stops when it is done (stop_reason "end_turn"); it only runs up to
    // this many output tokens and gets cut off (stop_reason "max_tokens") if it
    // would exceed it. A roomy cap like this does not make the answer longer -
    // it just leaves headroom so a one-sentence reply is never truncated.
    max_tokens: 256,
    messages: [{ role: "user", content: prompt }],
  });

  // message.content is an array of content blocks. Narrow on block.type ===
  // "text" before reading block.text - other block types (thinking, tool_use)
  // do not carry a .text field.
  const firstText = message.content.find((block) => block.type === "text");

  console.log(`\n=== ${model} ===`);
  console.log(firstText ? firstText.text : "(no text block in response)");
  // usage reports billable tokens: input_tokens is what you sent (prompt +
  // system), output_tokens is what the model generated. Cost scales with both,
  // and the rate per token differs by tier - that is the comparison to make.
  console.log(
    `tokens: input=${message.usage.input_tokens} output=${message.usage.output_tokens}`,
  );
}
