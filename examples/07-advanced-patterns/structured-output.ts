// bun run examples/07-advanced-patterns/structured-output.ts

import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();
const model = process.env.ANTHROPIC_DEFAULT_SONNET_MODEL ?? 'claude-sonnet-4-6';

type Sentiment = { label: 'positive' | 'negative' | 'neutral'; confidence: number };

const emitResult: Anthropic.Tool = {
  name: 'emit_result',
  description: 'Return the sentiment classification as structured data.',
  input_schema: {
    type: 'object',
    properties: {
      label: { type: 'string', enum: ['positive', 'negative', 'neutral'] },
      confidence: { type: 'number', description: 'A value from 0 to 1' },
    },
    required: ['label', 'confidence'],
  },
};

const response = await client.messages.create({
  model,
  max_tokens: 512,
  tools: [emitResult],
  tool_choice: { type: 'tool', name: 'emit_result' },
  messages: [
    { role: 'user', content: 'Classify the sentiment of: "This refactor saved me hours, fantastic work."' },
  ],
});

const block = response.content.find((b) => b.type === 'tool_use');
if (block && block.type === 'tool_use') {
  const result = block.input as Sentiment;
  console.log('label:', result.label);
  console.log('confidence:', result.confidence);
}
