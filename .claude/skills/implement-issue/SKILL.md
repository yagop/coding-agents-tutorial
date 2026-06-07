---
name: implement-issue
description: Implement a tutorial chapter or the README tracked by a GitHub issue in the coding-agents-tutorial repo. Fetches the issue, spawns an ultracode multi-agent Workflow that writes the chapter prose and every code sample and adversarially reviews each file, then pushes a branch and opens a PR that closes the issue. Use when asked to implement issue N, do chapter N, or fulfill a chapter task for this repo.
---

# Implement a tutorial issue

This skill turns one GitHub issue in `yagop/coding-agents-tutorial` into a branch and a pull request. Every issue maps to one deliverable: a chapter document plus its `examples/NN-slug/` code samples, or the top-level `README.md`.

The writing is done by an **ultracode multi-agent Workflow**, not by a single pass: one agent drafts the document, one agent per code sample implements it, and a second pass adversarially reviews and fixes each file before anything is committed. This keeps generated code honest (no invented SDK surface) and runnable.

## When to use
- The user asks to implement, do, or fulfill a specific issue or chapter in this repo (for example: implement issue 5, do chapter 3, write the README from issue 11).
- Handle exactly one issue per invocation.

## When not to use
- Bulk runs across many issues at once. Run the skill once per issue so each gets its own branch, PR, and review.
- Any repo other than `coding-agents-tutorial`.

## Inputs
- Issue number (required). Everything else is derived from the issue body and `OUTLINE.md`.

## Procedure

### 1. Read the issue and the outline
Fetch the issue body and the matching `OUTLINE.md` section.
- gh CLI: `gh issue view <N> --repo yagop/coding-agents-tutorial --json title,body`
- or GitHub MCP: `issue_read` (and `get_file_contents` for `OUTLINE.md`).

If `gh` is not installed, use the GitHub MCP tools (`issue_read`, `get_file_contents`, `create_branch`, `push_files`, `create_pull_request`, `add_issue_comment`).

### 2. Derive the deliverable
The issue body is already structured. Parse it into:
- **docPath**: for chapter issues 1-10 it is `chapters/NN-slug.md`; for the README issue (11) it is `README.md`.
- **samples**: one `{ path, spec }` per checkbox under `Code samples - examples/NN-slug/`. The spec is the one-line description after the filename. The README issue has no samples.
- **docSpec**: the issue Goal + Learning objectives + Scope, which the document must teach in full.
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
  docSpec: '<the issue Goal + Learning objectives + Scope: the chapter must teach all of it as runnable prose that references each sample file by name>',
  samples: [
    { path: 'examples/05-tools/define-tool.ts', spec: 'declare a get_weather tool with input_schema and inspect the returned tool_use block' },
    // ...one entry per Code samples checkbox in the issue
  ],
  conventions: '<paste Appendix B verbatim>',
  context: '<the full issue body PLUS the matching OUTLINE.md chapter section, verbatim>',
}
```

For the README issue: set `docPath` to `README.md`, `samples` to `[]`, and `docSpec` to the README issue checklist.

### 5. Commit the generated files
The Workflow returns `{ files: [{ path, content }], flagged: [...] }`. Write each file to its `path` in the local clone, then commit them all in one commit on the branch with `git`:
- `git add <every path>` (or `git add -A`), then `git commit -m 'Implement #<N>: <title>'`, then `git push -u origin <branch>`.

### 6. Open the PR
Create a pull request from the branch into `main`:
- title: `Implement #<N>: <chapter title>`
- body: start with `Closes #<N>`, then paste the issue Definition of done as a checklist, then a **Review flags** section listing any `flagged` files the Workflow could not fully verify (empty is good).
- MCP `create_pull_request({ owner, repo, head: branch, base: 'main', title, body })`.

Add a comment on the issue linking the PR (`gh issue comment <N> --body ...`, or MCP `add_issue_comment`). Always post this comment.

### 7. Verify
- If a local clone exists: run `bun install` once, then `bun run <file>` (or `bunx tsc --noEmit`) on the new files and paste results into the PR.
- If no clone: rely on the Workflow review pass and state in the PR that a local/CI run is still pending. Never claim the code runs if it was not executed.

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
  name: 'implement-tutorial-issue',
  description: 'Write a tutorial doc and its code samples for one GitHub issue, review each file, return files to commit',
  phases: [
    { title: 'Doc' },
    { title: 'Implement' },
    { title: 'Review' },
  ],
}

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

const CONV = args.conventions
const CTX = args.context

phase('Doc')
const doc = await agent(`Write the deliverable Markdown document for this tutorial issue.
Target path: ${args.docPath}

It must fully satisfy this spec:
${args.docSpec}

Reference material (issue body plus outline section):
${CTX}

Conventions you MUST follow:
${CONV}

The prose must reference each code sample by filename so a reader can run them in order. Return the path and the complete file content.`,
  { schema: FILE, label: 'doc:' + args.docPath, phase: 'Doc' })

phase('Implement')
const samples = args.samples || []
const reviewed = await pipeline(
  samples,
  (s) => agent(`Implement this tutorial code sample as a complete, runnable file.
Path: ${s.path}
What it must demonstrate: ${s.spec}

Reference material (issue plus outline):
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
- Use the official `@anthropic-ai/sdk` package. Construct the client with `new Anthropic()` so it reads `ANTHROPIC_API_KEY` from the environment. Use only real SDK surface: `client.messages.create`, `client.messages.stream`, content blocks (`text`, `tool_use`, `tool_result`, `thinking`), and fields like `stop_reason`, `usage`, `system`, `tools`, `input_schema`, `tool_choice`, `cache_control`, plus error classes (`Anthropic.APIError`, `RateLimitError`). Do not invent methods.
- Secrets come from the environment / a `.env` file (Bun auto-loads it). Never hardcode keys.
- TypeScript style: prefer `type` over `interface`; never use `unknown` or index signatures; reuse SDK-exported types (`Anthropic.MessageParam`, `Anthropic.Tool`, `Anthropic.ToolUseBlock`, etc.).
- ASCII punctuation only: `-`, `->`, `...`. No em dashes, no smart quotes.
- Each example is standalone and runnable on its own. Begin each file with a short header comment giving the run command (for example: `// bun run examples/05-tools/define-tool.ts`).
- Telegram samples use raw `fetch` against the Bot API (`https://api.telegram.org/bot<token>/<method>`) and read `TELEGRAM_BOT_TOKEN` from the environment. Do not add `node-telegram-bot-api` or any third-party Telegram dependency.
