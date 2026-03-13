import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Nethereum',
  tagline: 'The .NET integration platform for Ethereum',
  favicon: 'img/favicon-32x32.png',

  future: {
    v4: true,
  },

  url: 'https://docs.nethereum.com',
  baseUrl: '/',

  organizationName: 'Nethereum',
  projectName: 'Nethereum.Documentation',

  onBrokenLinks: 'warn',

  markdown: {
    mermaid: true,
    format: 'detect',
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  headTags: [
    {
      tagName: 'link',
      attributes: {
        rel: 'apple-touch-icon',
        sizes: '180x180',
        href: '/img/apple-touch-icon.png',
      },
    },
    {
      tagName: 'link',
      attributes: {
        rel: 'icon',
        type: 'image/png',
        sizes: '16x16',
        href: '/img/favicon-16x16.png',
      },
    },
  ],

  themes: [
    '@docusaurus/theme-mermaid',
    ['@easyops-cn/docusaurus-search-local', {
      hashed: true,
      language: ['en'],
      highlightSearchTermsOnTargetPage: true,
      explicitSearchResultPath: true,
      indexBlog: false,
    }],
  ],

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/Nethereum/Nethereum.Documentation/tree/main/',
          lastVersion: 'current',
          versions: {
            current: {
              label: '6.0.0',
            },
          },
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/nethereum-social-card.jpg',
    colorMode: {
      defaultMode: 'dark',
      disableSwitch: false,
      respectPrefersColorScheme: false,
    },
    navbar: {
      title: 'Nethereum',
      logo: {
        alt: 'Nethereum Logo',
        src: 'img/nethereum-logo.png',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          type: 'doc',
          docId: 'what-do-you-want-to-do',
          position: 'left',
          label: 'I Want To...',
        },
        {
          type: 'doc',
          docId: 'component-catalog',
          position: 'left',
          label: 'Packages',
        },
        {
          href: 'http://playground.nethereum.com',
          label: 'Playground',
          position: 'left',
        },
        {
          type: 'docsVersionDropdown',
          position: 'right',
        },
        {
          href: 'https://discord.gg/u3Ej2BReNn',
          label: 'Discord',
          position: 'right',
        },
        {
          href: 'https://github.com/Nethereum/Nethereum',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Learn',
          items: [
            {label: 'Getting Started', to: '/docs/getting-started/welcome'},
            {label: 'What Do You Want to Do?', to: '/docs/what-do-you-want-to-do'},
            {label: 'Architecture Map', to: '/docs/architecture'},
            {label: 'Component Catalog', to: '/docs/component-catalog'},
          ],
        },
        {
          title: 'Sections',
          items: [
            {label: 'Core Foundation', to: '/docs/core-foundation/overview'},
            {label: 'Smart Contracts', to: '/docs/smart-contracts/overview'},
            {label: 'Data & Indexing', to: '/docs/data-and-indexing/overview'},
            {label: 'Wallet SDK', to: '/docs/wallet-sdk/overview'},
            {label: 'Blazor dApp Integration', to: '/docs/blazor-dapp-integration/overview'},
          ],
        },
        {
          title: 'Community',
          items: [
            {label: 'Discord', href: 'https://discord.gg/u3Ej2BReNn'},
            {label: 'GitHub', href: 'https://github.com/Nethereum/Nethereum'},
            {label: 'NuGet', href: 'https://www.nuget.org/profiles/nethereum'},
          ],
        },
        {
          title: 'Resources',
          items: [
            {label: 'Playground', href: 'http://playground.nethereum.com'},
          ],
        },
      ],
      copyright: `Copyright \u00a9 ${new Date().getFullYear()} Nethereum. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['csharp', 'json', 'bash', 'solidity'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
