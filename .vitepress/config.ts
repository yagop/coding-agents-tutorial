// VitePress site configuration (English + Spanish).
//
// Run locally (no install needed - vitepress is fetched on demand):
//   bun x vitepress@2.0.0-alpha.17 dev
//   bun x vitepress@2.0.0-alpha.17 build
//   bun x vitepress@2.0.0-alpha.17 preview
//
// Plain-object export (no `defineConfig` import from "vitepress") so the config
// loads without adding vitepress as a project dependency. srcDir is the repo
// root, so chapter snippet imports resolve `@` to the root from ANY locale:
//   <<< @/examples/01-sdk-first-request/hello.ts
// The same examples/ tree is shared by both languages - only prose is translated,
// never the code, so the examples can never drift between locales.

const GITHUB = 'https://github.com/yagop/coding-agents-tutorial'
const OUTLINE = GITHUB + '/blob/main/OUTLINE.md'

export default {
  title: 'Build Your Own Coding Agent',
  description:
    'A hands-on tutorial: build a coding agent with the Anthropic SDK (TypeScript + Bun).',

  // Project Pages path. Locales nest under it: / (English) and /es/ (Spanish).
  // Change to '/' if you add a custom domain.
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

  // Shared across locales; per-locale overrides live in `locales` below.
  themeConfig: {
    socialLinks: [{ icon: 'github', link: GITHUB }],
    search: {
      provider: 'local',
      options: {
        locales: {
          es: {
            translations: {
              button: { buttonText: 'Buscar', buttonAriaLabel: 'Buscar' },
              modal: {
                noResultsText: 'Sin resultados para',
                resetButtonTitle: 'Limpiar la búsqueda',
                displayDetails: 'Mostrar detalles',
                footer: {
                  selectText: 'seleccionar',
                  navigateText: 'navegar',
                  closeText: 'cerrar',
                },
              },
            },
          },
        },
      },
    },
  },

  // The language switcher in the nav is generated automatically from the
  // `label` of each locale.
  locales: {
    root: {
      label: 'English',
      lang: 'en-US',
      themeConfig: {
        nav: [
          { text: 'Home', link: '/' },
          { text: 'Outline', link: OUTLINE },
        ],
        // Chapters are appended here (per locale) as they land.
        sidebar: [{ text: 'Chapters', items: [] }],
        editLink: {
          pattern: GITHUB + '/edit/main/:path',
          text: 'Edit this page on GitHub',
        },
        outline: { label: 'On this page', level: 'deep' },
      },
    },
    es: {
      label: 'Español',
      lang: 'es-ES',
      link: '/es/',
      title: 'Crea tu propio agente de programación',
      description:
        'Un tutorial práctico: crea un agente de programación con el SDK de Anthropic (TypeScript + Bun).',
      themeConfig: {
        nav: [
          { text: 'Inicio', link: '/es/' },
          { text: 'Esquema', link: OUTLINE },
        ],
        sidebar: [{ text: 'Capítulos', items: [] }],
        editLink: {
          pattern: GITHUB + '/edit/main/:path',
          text: 'Editar esta página en GitHub',
        },
        outline: { label: 'En esta página', level: 'deep' },
        docFooter: { prev: 'Anterior', next: 'Siguiente' },
        lastUpdatedText: 'Última actualización',
        returnToTopLabel: 'Volver arriba',
        sidebarMenuLabel: 'Menú',
        darkModeSwitchLabel: 'Apariencia',
        langMenuLabel: 'Cambiar idioma',
      },
    },
  },

  markdown: {
    lineNumbers: true,
  },
}
