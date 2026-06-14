---
name: write-chapter
description: Write a tutorial chapter (or the README) from its GitHub issue in the coding-agents-tutorial repo. Reads the issue's spec, spawns an ultracode multi-agent Workflow that writes the chapter prose (with VitePress snippet imports) and every code sample and adversarially reviews each file, then pushes a branch and opens a PR that closes the issue. Use when asked to write, draft, or implement a chapter, do chapter N, or fulfill a chapter issue for this repo.
---

# Write a tutorial chapter

This skill turns one GitHub issue in `yagop/coding-agents-tutorial` into a branch and a pull request. Every issue maps to one deliverable: a chapter document plus its `examples/NN-slug/` code samples, or the top-level `README.md`.

The writing is done by an **ultracode multi-agent Workflow**, not by a single pass: one agent drafts the document, one agent per code sample implements it, and a second pass adversarially reviews and fixes each file before anything is committed. This keeps generated code honest (no invented SDK surface) and runnable.

## When to use
- The user asks to implement, do, or fulfill a specific issue or chapter in this repo (for example: implement issue 5, do chapter 3, write the README from issue 11).
- Handle exactly one issue per invocation.

## When not to use
- Bulk runs across many issues at once. Run the skill once per issue so each gets its own branch, PR, and review.
- Any repo other than `coding-agents-tutorial`.

## Inputs
- Issue number (required). Everything else is derived from the issue body, which contains the full chapter spec.

## Procedure

### 1. Read the issue
Fetch the issue body - it contains the full chapter spec (Goal, What to cover, Going deeper, Out of scope, Code samples, Definition of done). `OUTLINE.md` is now just a top-level index that links to the issues.
- gh CLI: `gh issue view <N> --repo yagop/coding-agents-tutorial --json title,body`
- or GitHub MCP: `issue_read`.

If `gh` is not installed, use the GitHub MCP tools (`issue_read`, `get_file_contents`, `create_branch`, `push_files`, `create_pull_request`, `add_issue_comment`).

### 2. Derive the deliverable
The issue body is already structured. Parse it into:
- **docPath**: for chapter issues 1-10 it is `chapters/NN-slug.md`; for the README issue (11) it is `README.md`.
- **samples**: one `{ path, spec }` per checkbox under `Code samples - examples/NN-slug/`. The spec is the one-line description after the filename. The README issue has no samples.
- **docSpec**: the issue Goal + What to cover (plus any Going deeper asides), which the document must teach within the Appendix B budgets.
- **acceptance**: the issue Definition of done (copied into the PR for tracking).

### 3. Create a branch
From `main`, create `issue-<N>-<slug>` (for example `issue-5-05-tools`). Use MCP `create_branch` or `git switch -c` in a clone.

### 4. Spawn the ultracode Workflow
Build the `args` object (below) from steps 1-2, then call the **Workflow** tool with the script in Appendix A. Invoking this skill is the opt-in: always use the Workflow tool here, do not hand-write the chapter yourself.

```js
const args = {
  issueNumber: 5,
  slug: '05-tools',
  branch: 'issue-5-05-tools',
  docPath: 'chapters/05-tools.md',
  docSpec: '<the issue Goal + What to cover: teach all of it as runnable prose, within the Appendix B budgets, referencing each sample file by name>',
  samples: [
    { path: 'examples/05-tools/define-tool.ts', spec: 'declare a get_weather tool with input_schema and inspect the returned tool_use block' },
    // ...one entry per Code samples checkbox in the issue
  ],
  conventions: '<paste Appendix B verbatim>',
  context: '<the full issue body, verbatim>',
}
```

For the README issue: set `docPath` to `README.md`, `samples` to `[]`, and `docSpec` to the README issue checklist.

### 5. Commit the generated files
The Workflow returns `{ files: [{ path, content }], flagged: [...] }`. Write each file to its `path` in the local clone. Then wire the new chapter into the published site before committing:
- Add the chapter to `themeConfig.sidebar` in `.vitepress/config.ts`, with `link` pointing at the chapter path without its `.md` extension (for example `/chapters/05-tools`).
- Link the chapter from the `README.md` table of contents.

Commit everything in one commit on the branch with `git`:
- `git add <every path>` (or `git add -A`), then `git commit -m 'Implement #<N>: <title>'`, then `git push -u origin <branch>`.

### 6. Open the PR
Create a pull request from the branch into `main`:
- title: `Implement #<N>: <chapter title>`
- body: start with `Closes #<N>`, then paste the issue Definition of done as a checklist, then a **Review flags** section listing any `flagged` files the Workflow could not fully verify (empty is good).
- MCP `create_pull_request({ owner, repo, head: branch, base: 'main', title, body })`.

Add a comment on the issue linking the PR (`gh issue comment <N> --body ...`, or MCP `add_issue_comment`). Always post this comment.

### 7. Verify
- Run every example end-to-end - do not just typecheck. Bun auto-loads a `.env` at the repo root for `.ts` files, so after `bun install` (once) run `bun run <file>` for each sample and paste the real output into the PR. Shell samples do not get `.env` auto-loaded - source it first: `set -a; . ./.env; set +a; bash <file>`.
- `bunx tsc --noEmit` must be clean, and the docs must build so snippet imports resolve: `bun x vitepress@2.0.0-alpha.17 build` (a broken `<<< @/examples/...` path fails the build).
- Check the chapter is within budget and paste the numbers in the PR: `wc -l chapters/NN-slug.md` (<=150) and `grep -c '^## ' chapters/NN-slug.md` (<=4 main-line H2s plus an optional What's next closer). Spot-check that each sample is <=35 lines with comment:code <=0.30.
- Only if no API credentials are available may you skip the live run - say so explicitly in the PR, and never claim the code runs if it was not executed.

## Special cases (accuracy)
- **Chapter 7 (extended thinking)** and **Chapter 9 (citations source schema, fine-tuning availability)** touch APIs that change. The review agents MUST confirm the exact shapes against current Anthropic docs (use WebFetch/WebSearch if available). If a detail cannot be verified, the sample should degrade gracefully and the file must be listed under Review flags in the PR rather than silently guessed.

## Acceptance criteria for a successful run
- A branch `issue-<N>-<slug>` exists with one commit containing the doc and every listed sample (no placeholders, no TODOs).
- A PR is open with `Closes #<N>` and the issue Definition of done as a checklist.
- Any unverified files are surfaced under Review flags, not hidden.

---

## Appendix A: the Workflow script

Pass this as the Workflow `script`, with the `args` from step 4.

```js
export const meta = {
  name: 'write-tutorial-chapter',
  description: 'Write a tutorial doc and its code samples for one GitHub issue, review each file, return files to commit',
  phases: [
    { title: 'Doc' },
    { title: 'Implement' },
    { title: 'Review' },
  ],
}

// The Workflow harness delivers `args` to the script as a JSON STRING, not an
// object. Parse it before use - otherwise every `A.field` is undefined and the
// Implement/Review pipeline silently fans out to zero samples (you get only the
// doc back, with no error).
const A = typeof args === 'string' ? JSON.parse(args) : (args || {})

const FILE = {
  type: 'object', additionalProperties: false, required: ['path', 'content'],
  properties: { path: { type: 'string' }, content: { type: 'string' } },
}

const REVIEW = {
  type: 'object', additionalProperties: false, required: ['path', 'content', 'ok', 'issues'],
  properties: {
    path: { type: 'string' },
    content: { type: 'string', description: 'Final corrected file content, ready to commit' },
    ok: { type: 'boolean', description: 'True only if the file meets every acceptance rule after correction' },
    issues: { type: 'array', items: { type: 'string' }, description: 'Problems found and fixed in content' },
  },
}

const CONV = A.conventions
const CTX = A.context

phase('Doc')
const doc = await agent(`Write the deliverable Markdown document for this tutorial issue.
Target path: ${A.docPath}

It must fully satisfy this spec:
${A.docSpec}

Reference material (the issue body):
${CTX}

Conventions you MUST follow:
${CONV}

Each chapter is published with VitePress. Do NOT paste a sample's full source into a fenced code block. Instead show it with a VitePress snippet import on its own line, so the rendered page always matches the runnable file:

<<< @/examples/NN-slug/file.ts

Reference and import every code sample in order, grouping them under AT MOST 4 main-line H2 sections - do NOT give each sample its own H2. Around each import use the snippet sandwich: at most one orienting sentence before, at most two "what to notice" sentences after. Use inline fenced blocks only for short illustrative fragments (a line or two), never for a whole sample file, and never paste package.json/tsconfig JSON. The prose must not restate code that the import already shows (one-home rule), and must not contradict it (variable names, prompts, models). Address the reader as "you"; the intro and at least one section must open with a warm, second-person sentence. Keep the whole chapter within 150 lines. You MAY use light visual aids - VitePress callouts (`:::`), a small Markdown table, and at most one small ASCII diagram - plus a few (not many) emoji, all used sparingly per the conventions. Return the path and the complete file content.`,
  { schema: FILE, label: 'doc:' + A.docPath, phase: 'Doc' })

phase('Implement')
const samples = A.samples || []
const reviewed = await pipeline(
  samples,
  (s) => agent(`Implement this tutorial code sample as a complete, runnable file.
Path: ${s.path}
What it must demonstrate: ${s.spec}

Reference material (the issue body):
${CTX}

Conventions you MUST follow:
${CONV}

Return the path and the complete file content. No placeholders, no TODOs.`,
    { schema: FILE, label: 'impl:' + s.path, phase: 'Implement' }),
  (file, s) => file ? agent(`Adversarially review this tutorial code sample and return a corrected version.
Path: ${s.path}
It must demonstrate: ${s.spec}

Find and FIX every instance of:
- An Anthropic SDK method or field that does not exist (no invented surface).
- A violation of the conventions below.
- Anything that would fail under bun run (syntax, type, import errors, missing await).
- Placeholders, TODOs, or incomplete logic.
- Non-ASCII punctuation.

For cutoff-sensitive APIs (extended thinking, citations source schema, fine-tuning), verify the exact shape against current Anthropic docs; if you cannot verify, set ok to false and explain in issues.

Conventions:
${CONV}

File to review:
${file.content}

Return: path, the FINAL corrected content, ok (true only if fully compliant), and the issues you fixed.`,
    { schema: REVIEW, label: 'review:' + s.path, phase: 'Review' }) : null
)

const sampleFiles = reviewed.filter(Boolean).map((r) => ({ path: r.path, content: r.content }))
const files = (doc ? [doc] : []).concat(sampleFiles)
const flagged = reviewed.filter(Boolean).filter((r) => !r.ok).map((r) => ({ path: r.path, issues: r.issues }))

return { files: files, flagged: flagged, count: files.length }
```

Scale the run to the issue: a small chapter is a handful of agents; a large one (chapter 10) fans out one implementer plus one reviewer per sample automatically through the pipeline.

---

## Appendix B: conventions (paste into args.conventions)

- Runtime is Bun. TypeScript files run directly with `bun run`. No build or transpile step.
- Use the official `@anthropic-ai/sdk` package. Construct the client with `new Anthropic()` so it reads `ANTHROPIC_API_KEY`, `ANTHROPIC_AUTH_TOKEN`, and `ANTHROPIC_BASE_URL` from the environment. Use only real SDK surface: `client.messages.create`, `client.messages.stream`, content blocks (`text`, `tool_use`, `tool_result`, `thinking`), and fields like `stop_reason`, `usage`, `system`, `tools`, `input_schema`, `tool_choice`, `cache_control`, plus error classes (`Anthropic.APIError`, `RateLimitError`). Do not invent methods.
- Secrets come from the environment / a `.env` file (Bun auto-loads it). Never hardcode keys.
- Provider-agnostic samples: the same file must run unchanged against Anthropic direct OR any Anthropic-compatible gateway (for example Z.ai). Never hardcode a model id or a base URL. Read the model from the environment with a Claude fallback - `process.env.ANTHROPIC_DEFAULT_SONNET_MODEL ?? 'claude-sonnet-4-6'` (and `ANTHROPIC_DEFAULT_OPUS_MODEL` / `ANTHROPIC_DEFAULT_HAIKU_MODEL` for the other tiers) - and let `new Anthropic()` pick up the key, token, and base URL. Shell/curl samples read `ANTHROPIC_BASE_URL` and send `Authorization: Bearer $ANTHROPIC_AUTH_TOKEN` when that token is set, otherwise `x-api-key: $ANTHROPIC_API_KEY`.
- Auth and runtime env vars are introduced and explained once, in Chapter 1: `ANTHROPIC_API_KEY` (sent as `x-api-key`, Anthropic direct), `ANTHROPIC_AUTH_TOKEN` (sent as `Authorization: Bearer`, used by some compatible providers), and `ANTHROPIC_BASE_URL` (which endpoint to call). Later chapters assume them; only mention an env var a sample actually uses.
- TypeScript style: prefer `type` over `interface`; never use `unknown` or index signatures; reuse SDK-exported types (`Anthropic.MessageParam`, `Anthropic.Tool`, `Anthropic.ToolUseBlock`, etc.).
- ASCII punctuation only: `-`, `->`, `...`. No em dashes, no smart quotes. (This governs punctuation; emoji are allowed in chapter prose per the visual-aids rule, but code and example files stay ASCII-only.)
- Each example is standalone and runnable on its own. Begin each file with a short header comment giving the run command (for example: `// bun run examples/05-tools/define-tool.ts`).
- Chapters are rendered by VitePress and published to GitHub Pages. In chapter prose, show a sample's full source with a VitePress snippet import (`<<< @/examples/NN-slug/file.ts`) on its own line, NOT by pasting the code into a fenced block - this keeps the rendered docs in lockstep with the runnable file. Inline fenced blocks are only for short illustrative fragments. The runnable file under `examples/` is the single source of truth; prose must not contradict it. After editing chapters, the site builds with `bun x vitepress@2.0.0-alpha.17 build`.
- Do NOT add Markdown links to chapters or pages that do not exist yet (for example a "next chapter" pointer like `[Chapter 2](./02-streaming.md)`). VitePress fails the build on dead links - refer to a not-yet-written chapter as plain text, and only turn it into a link once that page exists.
- Telegram samples use raw `fetch` against the Bot API (`https://api.telegram.org/bot<token>/<method>`) and read `TELEGRAM_BOT_TOKEN` from the environment. Do not add `node-telegram-bot-api` or any third-party Telegram dependency.

### Conciseness and voice (hard budgets)

- Chapter budget: 80-130 lines (HARD CAP 150, `wc -l`) and AT MOST 4 main-line H2 sections (a one-line "What's next" closer is free; Going-deeper asides do not count). Group scope items and samples into those sections; never one H2 per sample.
- Snippet sandwich: at most one orienting sentence before each `<<<` import and at most two after. The runnable file is the lesson; prose orients and connects, it does not re-narrate the code.
- One-home rule: teach each fact once - in the prose OR a code comment, never both (example comments render inline via the snippet import, so a duplicated explanation shows up twice on the same page).
- Teach only what this chapter reaches: enum/option lists (for example `stop_reason` values) include only values a sample exercises, plus one short deferral clause for the rest.
- Going-deeper asides: secondary material (extra providers, full configs, full taxonomies) goes in a `::: details` block (or a `::: tip`/`::: info` callout), never a main-line H2. The main line must read complete if every aside is collapsed.
- Visual aids, used sparingly (seasoning, not structure): VitePress callout containers (`::: tip`, `::: info`, `::: warning`, `::: details`) for asides; AT MOST one small ASCII diagram per chapter, and only where a picture genuinely beats a sentence; a small Markdown table when comparing a short list of options (for example env vars or model tiers). Emoji are low-density: a few per chapter at most, and NOT one on every heading - reach for one only where it adds real warmth or scannability.
- Config lives in the repo, not the prose: no `package.json`/`tsconfig.json` JSON dumps in a chapter - one sentence plus the run command, and note the repo already ships the scaffold so a follow-along reader can just run the file.
- Example code budget: each sample <=35 lines and comment:code ratio <=0.30 (a comment line's first token is `//` or `#`; an end-of-line comment counts as code). The header comment is the run command and nothing else. No numbered `// 1) ... // 2) ...` blocks over `console.log` groups, and no reference tables inside code files.
- Friendliness floor: address the reader as "you" (never "the user" or "one"); the intro and at least one section open with a warm, second-person sentence. Terse is not the same as friendly.
