// bun run examples/05-tools/tool-errors.ts

import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();
const model = process.env.ANTHROPIC_DEFAULT_SONNET_MODEL ?? 'claude-sonnet-4-6';

const tools: Anthropic.Tool[] = [
  {
    name: 'divide',
    description: 'Divide one number by another. Call this for any division.',
    input_schema: {
      type: 'object',
      properties: {
        numerator: { type: 'number', description: 'The number being divided.' },
        denominator: { type: 'number', description: 'The number to divide by.' },
      },
      required: ['numerator', 'denominator'],
    },
  },
];

type DivideInput = { numerator: number; denominator: number };

// block.input arrives as a parsed object from the SDK - read it, never re-parse the raw JSON.
function divide(block: Anthropic.ToolUseBlock): Anthropic.ToolResultBlockParam {
  const { numerator, denominator } = block.input as DivideInput;

  // On bad input, return is_error: true with a message the model can act on - do not throw.
  if (denominator === 0) {
    return {
      type: 'tool_result',
      tool_use_id: block.id,
      is_error: true,
      content: 'denominator was 0; division is undefined. Ask the user for a non-zero divisor.',
    };
  }

  // A normal success result echoes the same tool_use_id and omits is_error.
  return {
    type: 'tool_result',
    tool_use_id: block.id,
    content: String(numerator / denominator),
  };
}

const messages: Anthropic.MessageParam[] = [
  { role: 'user', content: 'Use the divide tool: first compute 7 / 0, then 9 / 3.' },
];
const message = await client.messages.create({ model, max_tokens: 512, tools, messages });

if (message.stop_reason === 'tool_use') {
  messages.push({ role: 'assistant', content: message.content });

  const results = message.content
    .filter((block) => block.type === 'tool_use')
    .map(divide);

  for (const result of results) {
    console.log(`${result.is_error ? 'error' : 'ok'}: ${result.content}`);
  }

  messages.push({ role: 'user', content: results });
  const answer = await client.messages.create({ model, max_tokens: 512, tools, messages });

  const text = answer.content.find((block) => block.type === 'text');
  console.log('claude:', text?.text ?? '');
}
