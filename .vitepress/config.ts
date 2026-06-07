// VitePress site configuration.
//
// Run locally (no install needed - vitepress is fetched on demand):
//   bun x vitepress@2.0.0-alpha.17 dev
//   bun x vitepress@2.0.0-alpha.17 build
//   bun x vitepress@2.0.0-alpha.17 preview
//
// This is a plain object export (no `defineConfig` import from "vitepress") so
// the config loads without adding vitepress as a project dependency. srcDir is
// the repo root, which is why chapter snippet imports resolve `@` to the root:
//   <<< @/examples/01-sdk-first-request/hello.ts
export default {
  title: 'Build Your Own Coding Agent',
  description:
    'A hands-on tutorial: build a coding agent with the Anthropic SDK (TypeScript + Bun).',

  // Project Pages live under https://yagop.github.io/coding-agents-tutorial/
  // so the base path must match the repo name. Change to '/' for a custom domain.
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
      { text: 'Chapter 1', link: '/chapters/01-sdk-first-request' },
      {
        text: 'Outline',
        link: 'https://github.com/yagop/coding-agents-tutorial/blob/main/OUTLINE.md',
      },
    ],

    sidebar: [
      {
        text: 'Chapters',
        items: [
          {
            text: '1. The Claude SDK and Your First API Request',
            link: '/chapters/01-sdk-first-request',
          },
          // Chapters 2-10 are appended here as they land.
        ],
      },
    ],

    search: { provider: 'local' },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/yagop/coding-agents-tutorial' },
    ],

    editLink: {
      pattern:
        'https://github.com/yagop/coding-agents-tutorial/edit/main/:path',
      text: 'Edit this page on GitHub',
    },

    outline: 'deep',
  },

  markdown: {
    lineNumbers: true,
  },
}
