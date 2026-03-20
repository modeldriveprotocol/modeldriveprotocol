import { defineConfig } from "vitepress";

const base = resolveGitHubPagesBase();

export default defineConfig({
  title: "MDP",
  description: "Model Drive Protocol documentation",
  lang: "zh-CN",
  base,
  cleanUrls: true,
  lastUpdated: true,
  appearance: false,
  themeConfig: {
    siteTitle: "MDP",
    nav: [
      { text: "Guide", link: "/guide/introduction" },
      { text: "Protocol", link: "/protocol/overview" },
      { text: "Server", link: "/server/overview" },
      { text: "Client", link: "/client/overview" },
      { text: "Examples", link: "/examples/browser-client" },
      { text: "Reference", link: "/reference/glossary" }
    ],
    sidebar: {
      "/guide/": [
        {
          text: "Guide",
          items: [
            { text: "Introduction", link: "/guide/introduction" },
            { text: "Architecture", link: "/guide/architecture" },
            { text: "Quick Start", link: "/guide/quick-start" },
            { text: "FAQ", link: "/guide/faq" }
          ]
        }
      ],
      "/protocol/": [
        {
          text: "Protocol",
          items: [
            { text: "Overview", link: "/protocol/overview" },
            { text: "Capability Model", link: "/protocol/capability-model" },
            { text: "Transport", link: "/protocol/transport" },
            { text: "Lifecycle", link: "/protocol/lifecycle" },
            { text: "MCP Bridge", link: "/protocol/mcp-bridge" },
            { text: "Message Schema", link: "/protocol/message-schema" },
            { text: "Security", link: "/protocol/security" }
          ]
        }
      ],
      "/server/": [
        {
          text: "Server",
          items: [
            { text: "Overview", link: "/server/overview" },
            { text: "MVP Design", link: "/server/mvp-design" },
            { text: "API", link: "/server/api" }
          ]
        }
      ],
      "/client/": [
        {
          text: "Client",
          items: [
            { text: "Overview", link: "/client/overview" },
            { text: "JS Client", link: "/client/js-client" },
            { text: "Embedding", link: "/client/embedding" }
          ]
        }
      ],
      "/examples/": [
        {
          text: "Examples",
          items: [
            { text: "Browser Client", link: "/examples/browser-client" },
            { text: "Native Client", link: "/examples/native-client" },
            { text: "End-to-End", link: "/examples/end-to-end" }
          ]
        }
      ],
      "/reference/": [
        {
          text: "Reference",
          items: [
            { text: "Glossary", link: "/reference/glossary" },
            { text: "Roadmap", link: "/reference/roadmap" }
          ]
        }
      ]
    },
    footer: {
      message: "Model Drive Protocol",
      copyright: "MIT"
    }
  }
});

function resolveGitHubPagesBase(): string {
  if (process.env.VITEPRESS_BASE) {
    return normalizeBase(process.env.VITEPRESS_BASE);
  }

  const repository = process.env.GITHUB_REPOSITORY?.split("/")[1];
  const owner = process.env.GITHUB_REPOSITORY_OWNER;

  if (!repository || !owner) {
    return "/";
  }

  const userOrOrgSiteRepository = `${owner.toLowerCase()}.github.io`;

  return repository.toLowerCase() === userOrOrgSiteRepository
    ? "/"
    : normalizeBase(`/${repository}/`);
}

function normalizeBase(value: string): string {
  if (value === "/") {
    return value;
  }

  const withLeadingSlash = value.startsWith("/") ? value : `/${value}`;
  return withLeadingSlash.endsWith("/")
    ? withLeadingSlash
    : `${withLeadingSlash}/`;
}
