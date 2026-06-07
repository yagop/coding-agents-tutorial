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
const OUTLINE = GITHUB + '/blob/main/OUTLINE.md'

export default {
  title: 'Build Your Own Coding Agent',
  description:
    'A hands-on tutorial: build a coding agent with the Anthropic SDK (TypeScript + Bun).',
  lang: 'en-US',

  // Project Pages path. Change to '/' if you add a custom domain.
  base: '/coding-agents-tutorial/',
  cleanUrls: true,
  lastUpdated: true,

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
      { text: 'Home', link: '/' },
      { text: 'Outline', link: OUTLINE },
    ],
    // Chapters are appended here as they land.
    sidebar: [
      {
        text: 'Chapters',
        items: [
          {
            text: '1. The Claude SDK and Your First API Request',
            link: '/chapters/01-sdk-first-request',
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
