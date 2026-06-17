---
name: write-chapter
description: Write a tutorial chapter (or the README) from its GitHub issue in the coding-agents-tutorial repo. Reads the issue's spec, writes the chapter prose (with VitePress snippet imports) and every code sample, reviews each file against the conventions, then pushes a branch and opens a PR that closes the issue. Use when asked to write, draft, or implement a chapter, do chapter N, or fulfill a chapter issue for this repo.
---

# Write a tutorial chapter

This skill turns one GitHub issue in `yagop/coding-agents-tutorial` into a branch and a pull request. Every issue maps to one deliverable: a chapter document plus its `examples/NN-slug/` code samples, or the top-level `README.md`.

You write everything yourself in a single pass: draft the chapter document, implement each code sample, then re-read every file with fresh, adversarial eyes against the review checklist (Appendix A) and fix what you find before committing. That review pass is what keeps the code honest (no invented SDK surface) and runnable - do not skip it.

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

### 4. Write the chapter and the samples
Author every file yourself, following Appendix A (how to write and review) and the Appendix B conventions. Do this directly in the working tree - do not call a Workflow or any other agent tool to generate the chapter.
- Write the chapter document at `docPath`. Show each sample with a VitePress snippet import (`<<< @/examples/NN-slug/file.ts`) on its own line - import EXACTLY the samples from step 2, in order, and reference no example path that is not one of them. Never paste a sample's full source into a fenced block.
- Write each sample file under `examples/NN-slug/` as a complete, runnable file - no placeholders, no TODOs.
- Then run the review checklist in Appendix A over the document and every sample, and fix what it finds, before you commit.

For the README issue (11): the deliverable is just `README.md` (no samples); write it to the README issue checklist.

### 5. Commit the generated files
The deliverable is exactly the chapter doc plus the listed sample files. If any stray files exist under `examples/NN-slug/` that are NOT listed in the issue, delete them before committing, and confirm the chapter imports only the listed samples. Then wire the new chapter into the published site before committing:
- Add the chapter to `themeConfig.sidebar` in `.vitepress/config.ts`, with `link` pointing at the chapter path without its `.md` extension (for example `/chapters/05-tools`).
- Link the chapter from the `README.md` table of contents.

Commit everything in one commit on the branch with `git`:
- `git add <every path>` (or `git add -A`), then `git commit -m 'Implement #<N>: <title>'`, then `git push -u origin <branch>`.

### 6. Open the PR
Create a pull request from the branch into `main`:
- title: `Implement #<N>: <chapter title>`
- body: start with `Closes #<N>`, then paste the issue Definition of done as a checklist, then a **Review flags** section listing any file you could not fully verify - for example an SDK shape you could not confirm against the docs (empty is good).
- MCP `create_pull_request({ owner, repo, head: branch, base: 'main', title, body })`.

Add a comment on the issue linking the PR (`gh issue comment <N> --body ...`, or MCP `add_issue_comment`). Always post this comment.

### 7. Verify
- Run every example end-to-end - do not just typecheck. Bun auto-loads a `.env` at the repo root for `.ts` files, so after `bun install` (once) run `bun run <file>` for each sample and paste the real output into the PR. Shell samples do not get `.env` auto-loaded - source it first: `set -a; . ./.env; set +a; bash <file>`.
- `bunx tsc --noEmit` must be clean, and the docs must build so snippet imports resolve: `bun x vitepress@2.0.0-alpha.17 build` (a broken `<<< @/examples/...` path fails the build).
- Check the chapter is within budget and paste the numbers in the PR: `wc -l chapters/NN-slug.md` (<=150) and `grep -c '^## ' chapters/NN-slug.md` (<=4 main-line H2s plus an optional What's next closer). Spot-check that each sample is readable (one statement per line, no golfed one-liners or comma-operator sequencing) and within budget - aim <=70 lines, hard cap 100 (`wc -l`), comment:code <=0.40.
- Only if no API credentials are available may you skip the live run - say so explicitly in the PR, and never claim the code runs if it was not executed.

## Special cases (accuracy)
- **Chapter 7 (extended thinking)** and **Chapter 9 (citations source schema, fine-tuning availability)** touch APIs that change. During the review pass you MUST confirm the exact shapes against current Anthropic docs (use WebFetch/WebSearch if available). If a detail cannot be verified, the sample should degrade gracefully and the file must be listed under Review flags in the PR rather than silently guessed.

## Acceptance criteria for a successful run
- A branch `issue-<N>-<slug>` exists with one commit containing the doc and every listed sample (no placeholders, no TODOs).
- A PR is open with `Closes #<N>` and the issue Definition of done as a checklist.
- Any unverified files are surfaced under Review flags, not hidden.

---

## Appendix A: how to write and review the files

You author the document and every sample yourself, in one pass, then review each file before committing. There is no separate agent - the "review" is you re-reading each file against the checklist below with fresh, adversarial eyes.

### Writing the chapter document
- Fully satisfy the docSpec (the issue Goal + What to cover) within the Appendix B budgets.
- Show each sample with a VitePress snippet import on its own line (`<<< @/examples/NN-slug/file.ts`). Import EXACTLY the samples from step 2, in order, and reference no example path that is not one of them. Do NOT paste a sample's full source into a fenced block - inline fenced blocks are only for short illustrative fragments (a line or two).
- Group the imports under AT MOST 4 main-line H2 sections (never one H2 per sample). Around each import use the snippet sandwich: at most one orienting sentence before, at most two "what to notice" sentences after.
- One-home rule: the prose must not restate what an inline code comment already says, and must not contradict the code (variable names, prompts, models). Address the reader as "you"; the intro and at least one section open with a warm, second-person sentence.

### Writing each sample
- A complete, runnable Bun TypeScript file - no placeholders, no TODOs - following the Appendix B conventions. Begin each file with the run-command header comment and nothing else.

### Review checklist (run over the document and every sample before committing)
Re-read each file with adversarial eyes and fix every instance of:
- An Anthropic SDK method or field that does not exist (no invented surface).
- A violation of the Appendix B conventions.
- Anything that would fail under `bun run` (syntax, type, import errors, missing await).
- Placeholders, TODOs, or incomplete logic.
- Non-ASCII punctuation outside a fenced diagram (prose and code stay ASCII; box-drawing and arrows are fine inside a ``` diagram).
- A diagram whose connectors do not line up under the node they descend from, or a vertical with no arrowhead - render the page and eyeball the diagram, never trust the raw source.
- Golfed/compressed code: any line that stacks multiple statements, sequences side effects with the comma operator, or inlines a multi-step expression to save a line. Re-expand to one statement per line (a multi-line `async function` over a dense one-line arrow), even if that grows the file - up to the 100-line hard cap. A correct-but-dense one-liner is a defect here, not a pass.

For cutoff-sensitive APIs (extended thinking, citations source schema, fine-tuning), verify the exact shape against current Anthropic docs; if you cannot verify, list the file under Review flags in the PR rather than guess.

---

## Appendix B: conventions (the rules every chapter and sample must follow)

- Runtime is Bun. TypeScript files run directly with `bun run`. No build or transpile step.
- Use the official `@anthropic-ai/sdk` package. Construct the client with `new Anthropic()` so it reads `ANTHROPIC_API_KEY`, `ANTHROPIC_AUTH_TOKEN`, and `ANTHROPIC_BASE_URL` from the environment. Use only real SDK surface: `client.messages.create`, `client.messages.stream`, content blocks (`text`, `tool_use`, `tool_result`, `thinking`), and fields like `stop_reason`, `usage`, `system`, `tools`, `input_schema`, `tool_choice`, `cache_control`, plus error classes (`Anthropic.APIError`, `RateLimitError`). Do not invent methods.
- Secrets come from the environment / a `.env` file (Bun auto-loads it). Never hardcode keys.
- Provider-agnostic samples: the same file must run unchanged against Anthropic direct OR any Anthropic-compatible gateway (for example Z.ai). Never hardcode a model id or a base URL. Read the model from the environment with a Claude fallback - `process.env.ANTHROPIC_DEFAULT_SONNET_MODEL ?? 'claude-sonnet-4-6'` (and `ANTHROPIC_DEFAULT_OPUS_MODEL` / `ANTHROPIC_DEFAULT_HAIKU_MODEL` for the other tiers) - and let `new Anthropic()` pick up the key, token, and base URL. Shell/curl samples read `ANTHROPIC_BASE_URL` and send `Authorization: Bearer $ANTHROPIC_AUTH_TOKEN` when that token is set, otherwise `x-api-key: $ANTHROPIC_API_KEY`.
- Auth and runtime env vars are introduced and explained once, in Chapter 1: `ANTHROPIC_API_KEY` (sent as `x-api-key`, Anthropic direct), `ANTHROPIC_AUTH_TOKEN` (sent as `Authorization: Bearer`, used by some compatible providers), and `ANTHROPIC_BASE_URL` (which endpoint to call). Later chapters assume them; only mention an env var a sample actually uses.
- TypeScript style: prefer `type` over `interface`; never use `unknown` or index signatures; reuse SDK-exported types (`Anthropic.MessageParam`, `Anthropic.Tool`, `Anthropic.ToolUseBlock`, etc.).
- Loop idioms: for an unbounded produce-then-consume loop (long-polling an API, draining an event stream), prefer an async generator - `async function* poll()` that `yield`s, consumed with `for await (const x of poll())` - which separates transport from handling and matches the `for await...of` style used elsewhere. Where a generator does not fit, use `while (true)`. Never use `for (;;)`.
- ASCII punctuation in prose and code: `-`, `->`, `...`. No em dashes, no smart quotes. (This governs punctuation; emoji are allowed in chapter prose per the visual-aids rule, but code and example files stay ASCII-only.) The one exception: inside a fenced diagram (a ``` block) you MAY use Unicode box-drawing and arrow characters for a cleaner picture - the commit hook permits non-ASCII inside fences, while everything outside a fence stays ASCII.
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
- Visual aids, used sparingly (seasoning, not structure): VitePress callout containers (`::: tip`, `::: info`, `::: warning`, `::: details`) for asides; AT MOST one small diagram per chapter, only where a picture genuinely beats a sentence - draw it with Unicode box-drawing inside a ``` fence (cleaner than ASCII `|`/`v`/`->` art, which is also fine), make the connectors line up under the node they descend from, give every descending line an arrowhead, and render the page to eyeball it; a small Markdown table when comparing a short list of options (for example env vars or model tiers).
- Config lives in the repo, not the prose: no `package.json`/`tsconfig.json` JSON dumps in a chapter - one sentence plus the run command, and note the repo already ships the scaffold so a follow-along reader can just run the file.
- Example code budget: keep each sample focused and single-concept; verbose, explicit code is welcome - favor clarity over brevity. Aim for <=70 lines (HARD CAP 100, `wc -l`) with comment:code ratio <=0.40 (a comment line's first token is `//` or `#`; an end-of-line comment counts as code). The header comment is the run command and nothing else. No numbered `// 1) ... // 2) ...` blocks over `console.log` groups, and no reference tables inside code files.
- Readability outranks the line count - never golf a sample to hit the budget. One statement per line: do NOT join multiple statements with `;` on one line, do NOT use the comma operator to sequence side effects (`(last = now), edit(...)`), and do NOT inline a multi-step expression (for example `(await fetch(...)).json()` with method/headers/body options) purely to save a line. A normal multi-line `async function` helper beats a dense one-line arrow. The standalone-file rule means each Telegram/`fetch` sample re-pastes its own helper, and verbose, explicit style is encouraged - that is exactly why the budget is generous (up to 100 lines) for samples that need it. If a sample still cannot fit while staying readable, cut its scope (or, when writing the issue, split it into two samples) - compression is never the answer.
- Friendliness floor: address the reader as "you" (never "the user" or "one"); the intro and at least one section open with a warm, second-person sentence. Terse is not the same as friendly.
