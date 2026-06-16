// VitePress site configuration.
//
// Run locally (no install needed - vitepress is fetched on demand):
//   bun x vitepress@2.0.0-alpha.17 dev
//   bun x vitepress@2.0.0-alpha.17 build
//   bun x vitepress@2.0.0-alpha.17 preview
//
// Plain-object export (no `defineConfig` import from "vitepress") so the config
// loads without adding vitepress as a project dependency. srcDir is the repo
// root, so chapter snippet imports resolve `@` to the root:
//   <<< @/examples/01-sdk-first-request/hello.ts

const GITHUB = 'https://github.com/yagop/coding-agents-tutorial'

export default {
  title: 'Build Your Own Coding Agent',
  description:
    'A hands-on tutorial: build a coding agent with the Anthropic SDK (TypeScript + Bun).',
  lang: 'en-US',

  // Project Pages path. Change to '/' if you add a custom domain.
  base: '/coding-agents-tutorial/',
  cleanUrls: true,
  lastUpdated: true,

  // The first chapter IS the homepage: chapters/01 is rendered at the site root
  // ("/"). chapters/NN-slug.md stays the single source of truth; add later
  // chapters as normal /chapters/... routes.
  rewrites: {
    'chapters/01-sdk-first-request.md': 'index.md',
  },

  // Markdown files that are not tutorial pages.
  srcExclude: [
    'README.md',
    'OUTLINE.md',
    'coding-agents-tutorial.md',
    '**/SKILL.md',
    '.claude/**',
  ],

  themeConfig: {
    nav: [
      { text: 'Chapters', link: '/' },
    ],
    // Chapters are appended here as they land.
    sidebar: [
      {
        text: 'Chapters',
        items: [
          {
            text: '1. The Claude SDK and Your First API Request',
            link: '/',
          },
          {
            text: '2. Streaming Responses and Message Types',
            link: '/chapters/02-streaming',
          },
          {
            text: '3. Handling User Requests: REPL and Telegram Bot',
            link: '/chapters/03-repl-telegram',
          },
          {
            text: '4. Context and Conversation Management',
            link: '/chapters/04-context',
          },
          {
            text: '5. Implementing Tools and Function Calling',
            link: '/chapters/05-tools',
          },
          {
            text: '6. Building Tool Chains and Complex Workflows',
            link: '/chapters/06-tool-chains',
          },
        ],
      },
    ],
    search: { provider: 'local' },
    socialLinks: [{ icon: 'github', link: GITHUB }],
    editLink: {
      pattern: GITHUB + '/edit/main/:path',
      text: 'Edit this page on GitHub',
    },
    outline: { label: 'On this page', level: 'deep' },
  },

  markdown: {
    lineNumbers: true,
  },
}
