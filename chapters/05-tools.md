# Implementing Tools and Function Calling

🔧 Everything you have built so far lives entirely inside the conversation: words in, words out. Tools are how your agent reaches past that wall and touches the real world - reading a file, calling an API, running a query. Here is the part worth getting straight before any code: the model never runs your code. It only *emits* a structured request to call a tool, and then *reads* a structured result you hand back. You own every step in between. Master this one round-trip - declare a tool, catch the request, run it, return the result - and every multi-tool workflow in later chapters is just this loop again.

You already have `new Anthropic()`, the env vars, content-block narrowing, and the `messages` array from Chapters 1-2 (Chapter 4 helps too), so here you only add the tool layer. As always the key comes from the environment - never hardcode it - and Bun auto-loads `.env`, so there is nothing to import.

## Declaring a tool and catching the call

A tool is a small contract you give the model: a `name`, a `description` of when to use it, and an `input_schema` - JSON Schema with `type`, `properties`, `required`, and `enum` for fixed value sets. You declare it with the SDK's own `Anthropic.Tool` type, not a hand-rolled interface, and pass it in the `tools` array. When the model decides to call it, it returns a `tool_use` content block carrying an `id`, the `name`, and an `input`.

<<< @/examples/05-tools/define-tool.ts

Run it to watch a `get_weather` call come back:

```sh
bun run examples/05-tools/define-tool.ts
```

Notice that you find the call by narrowing `response.content` to the block whose `type === 'tool_use'` - an `Anthropic.ToolUseBlock` - exactly the way you narrowed `text` blocks before.

::: warning The one gotcha worth tattooing on your wrist
`block.input` arrives **already parsed** as an object from the SDK. Do not `JSON.parse` it, and never raw-string-match the serialized JSON to pull out an argument - read `block.input.location` like any plain object property.
:::

## Closing the loop with tool_result

Catching the call is half the round-trip; now you close it. The flow is a fixed five-step dance, and it is worth holding the whole shape in your head before you read the code:

```text
       create() with tools
                │
                ▼
     stop_reason: 'tool_use'
                │
                ▼
      run the tool locally
                │
                ▼
  create() with the tool_result
                │
                ▼
        final text answer
```

When `stop_reason === 'tool_use'`, you append the assistant's content **verbatim** as an assistant turn, run the tool yourself, then send a new `user` turn whose `content` is a `tool_result` block - an `Anthropic.ToolResultBlockParam` that echoes the `tool_use_id` exactly. That echo is the rule that binds request to answer: every `tool_use` block in a turn needs a matching `tool_result`, or the next `create` call rejects the array.

<<< @/examples/05-tools/single-tool-loop.ts

The second `create` carries the assistant turn and your `tool_result` back, so the model reads the weather you fetched and writes a final sentence - and this time `stop_reason` comes back `end_turn` because the model is done. (You will meet the other `stop_reason` values as the chapters need them.)

## Dispatching and recovering from errors

Real agents carry more than one tool, so a friendlier pattern is a map from `block.name` to a typed handler. You read `block.input` as the parsed object it already is, call the handler that matches the name, and build each `tool_result` from what the handler returns.

<<< @/examples/05-tools/dispatch-handlers.ts

Each handler owns one tool, and the dispatch map is the only thing that grows as you add more - the loop around it never changes. The handlers return the `tool_result` content the model reads next.

Handlers meet messy input, so they must not throw. When a tool's parsed arguments are wrong, return a `tool_result` with `is_error: true` and an informative message instead of crashing - the model reads the message and can correct itself or retry on the next turn.

<<< @/examples/05-tools/tool-errors.ts

The error result rides back in the exact same `tool_result` shape as a success; only `is_error: true` and the explaining message differ. A thrown exception kills your process and tells the model nothing - this hands it a chance to recover.

## Steering which tool the model picks

You will spend more time on descriptions than on schemas, and it pays off: the model chooses a tool almost entirely from your `description`. Lead with "call this when..." phrasing, give every property its own description, and use `enum` to pin a field to a fixed set so the model cannot invent a value. When you need a firmer hand, `tool_choice` overrides the model's own judgment.

| `tool_choice` | Effect |
| --- | --- |
| `{ type: 'auto' }` | Model decides whether to call a tool (the default). |
| `{ type: 'any' }` | Model must call some tool, its pick. |
| `{ type: 'tool', name }` | Model must call this exact tool. |
| `{ type: 'none' }` | Model may not call any tool. |

<<< @/examples/05-tools/tool-choice.ts

Each mode is a single line of config, and because this prompt plainly needs the weather tool, every mode here calls it - the modes only pull apart on a prompt the model could answer in plain text, where `auto` stays text while `any` and `{ type: 'tool' }` force the call. Adding `disable_parallel_tool_use: true` caps the model at one tool call per turn - the simplest way to keep this chapter's single round-trip single while you find your footing.

What's next: Chapter 6 - Building Tool Chains and Complex Workflows.