import { defineConfig, type DefaultTheme } from "vitepress";

type LocalePrefix = "" | "/zh-Hans";

interface LocaleCopy {
  nav: {
    guide: string;
    protocol: string;
    server: string;
    client: string;
    examples: string;
    playground: string;
    reference: string;
  };
  sections: {
    guide: string;
    protocol: string;
    server: string;
    client: string;
    examples: string;
    playground: string;
    reference: string;
  };
  pages: {
    introduction: string;
    architecture: string;
    quickStart: string;
    faq: string;
    overview: string;
    capabilityModel: string;
    transport: string;
    lifecycle: string;
    mcpBridge: string;
    messageSchema: string;
    security: string;
    serverOverview: string;
    mvpDesign: string;
    api: string;
    clientOverview: string;
    jsClient: string;
    embedding: string;
    browserClient: string;
    playground: string;
    nativeClient: string;
    endToEnd: string;
    glossary: string;
    roadmap: string;
  };
  footerMessage: string;
  outlineLabel: string;
  lastUpdatedText: string;
  docFooterPrev: string;
  docFooterNext: string;
  darkModeSwitchLabel: string;
  lightModeSwitchTitle: string;
  darkModeSwitchTitle: string;
  sidebarMenuLabel: string;
  returnToTopLabel: string;
  langMenuLabel: string;
}

const base = resolveGitHubPagesBase();

const enUS: LocaleCopy = {
  nav: {
    guide: "Guide",
    protocol: "Protocol",
    server: "Server",
    client: "Client",
    examples: "Examples",
    playground: "Playground",
    reference: "Reference"
  },
  sections: {
    guide: "Guide",
    protocol: "Protocol",
    server: "Server",
    client: "Client",
    examples: "Examples",
    playground: "Playground",
    reference: "Reference"
  },
  pages: {
    introduction: "Introduction",
    architecture: "Architecture",
    quickStart: "Quick Start",
    faq: "FAQ",
    overview: "Overview",
    capabilityModel: "Capability Model",
    transport: "Transport",
    lifecycle: "Lifecycle",
    mcpBridge: "MCP Bridge",
    messageSchema: "Message Schema",
    security: "Security",
    serverOverview: "Overview",
    mvpDesign: "MVP Design",
    api: "API",
    clientOverview: "Overview",
    jsClient: "JS Client",
    embedding: "Embedding",
    browserClient: "Browser Client",
    playground: "Playground",
    nativeClient: "Native Client",
    endToEnd: "End-to-End",
    glossary: "Glossary",
    roadmap: "Roadmap"
  },
  footerMessage: "Model Drive Protocol",
  outlineLabel: "On this page",
  lastUpdatedText: "Last updated",
  docFooterPrev: "Previous page",
  docFooterNext: "Next page",
  darkModeSwitchLabel: "Appearance",
  lightModeSwitchTitle: "Switch to light theme",
  darkModeSwitchTitle: "Switch to dark theme",
  sidebarMenuLabel: "Menu",
  returnToTopLabel: "Return to top",
  langMenuLabel: "Change language"
};

const zhHans: LocaleCopy = {
  nav: {
    guide: "指南",
    protocol: "协议",
    server: "服务端",
    client: "客户端",
    examples: "示例",
    playground: "Playground",
    reference: "参考"
  },
  sections: {
    guide: "指南",
    protocol: "协议",
    server: "服务端",
    client: "客户端",
    examples: "示例",
    playground: "Playground",
    reference: "参考"
  },
  pages: {
    introduction: "介绍",
    architecture: "架构",
    quickStart: "快速开始",
    faq: "常见问题",
    overview: "概览",
    capabilityModel: "能力模型",
    transport: "传输",
    lifecycle: "生命周期",
    mcpBridge: "MCP Bridge",
    messageSchema: "消息模型",
    security: "安全",
    serverOverview: "概览",
    mvpDesign: "MVP 设计",
    api: "API",
    clientOverview: "概览",
    jsClient: "JS 客户端",
    embedding: "嵌入方式",
    browserClient: "浏览器客户端",
    playground: "Playground",
    nativeClient: "原生客户端",
    endToEnd: "端到端",
    glossary: "术语表",
    roadmap: "路线图"
  },
  footerMessage: "模型驱动协议",
  outlineLabel: "本页导航",
  lastUpdatedText: "最后更新",
  docFooterPrev: "上一页",
  docFooterNext: "下一页",
  darkModeSwitchLabel: "外观",
  lightModeSwitchTitle: "切换到浅色主题",
  darkModeSwitchTitle: "切换到暗色主题",
  sidebarMenuLabel: "目录",
  returnToTopLabel: "返回顶部",
  langMenuLabel: "切换语言"
};

export default defineConfig({
  title: "MDP",
  description: "Model Drive Protocol documentation",
  base,
  cleanUrls: true,
  lastUpdated: true,
  appearance: true,
  locales: {
    root: {
      label: "en-US",
      lang: "en-US",
      title: "MDP",
      description: "Model Drive Protocol documentation",
      themeConfig: createThemeConfig("", enUS)
    },
    "zh-Hans": {
      label: "zh-Hans",
      lang: "zh-Hans",
      link: "/zh-Hans/",
      title: "MDP",
      description: "Model Drive Protocol 文档",
      themeConfig: createThemeConfig("/zh-Hans", zhHans)
    }
  }
});

function createThemeConfig(prefix: LocalePrefix, copy: LocaleCopy): DefaultTheme.Config {
  return {
    nav: [
      { text: copy.nav.guide, link: localePath(prefix, "/guide/introduction") },
      { text: copy.nav.protocol, link: localePath(prefix, "/protocol/overview") },
      { text: copy.nav.server, link: localePath(prefix, "/server/overview") },
      { text: copy.nav.client, link: localePath(prefix, "/client/overview") },
      { text: copy.nav.examples, link: localePath(prefix, "/examples/browser-client") },
      { text: copy.nav.playground, link: localePath(prefix, "/playground/") },
      { text: copy.nav.reference, link: localePath(prefix, "/reference/glossary") }
    ],
    sidebar: {
      [localePath(prefix, "/guide/")]: [
        {
          text: copy.sections.guide,
          items: [
            { text: copy.pages.introduction, link: localePath(prefix, "/guide/introduction") },
            { text: copy.pages.architecture, link: localePath(prefix, "/guide/architecture") },
            { text: copy.pages.quickStart, link: localePath(prefix, "/guide/quick-start") },
            { text: copy.pages.faq, link: localePath(prefix, "/guide/faq") }
          ]
        }
      ],
      [localePath(prefix, "/protocol/")]: [
        {
          text: copy.sections.protocol,
          items: [
            { text: copy.pages.overview, link: localePath(prefix, "/protocol/overview") },
            {
              text: copy.pages.capabilityModel,
              link: localePath(prefix, "/protocol/capability-model")
            },
            { text: copy.pages.transport, link: localePath(prefix, "/protocol/transport") },
            { text: copy.pages.lifecycle, link: localePath(prefix, "/protocol/lifecycle") },
            { text: copy.pages.mcpBridge, link: localePath(prefix, "/protocol/mcp-bridge") },
            {
              text: copy.pages.messageSchema,
              link: localePath(prefix, "/protocol/message-schema")
            },
            { text: copy.pages.security, link: localePath(prefix, "/protocol/security") }
          ]
        }
      ],
      [localePath(prefix, "/server/")]: [
        {
          text: copy.sections.server,
          items: [
            { text: copy.pages.serverOverview, link: localePath(prefix, "/server/overview") },
            { text: copy.pages.mvpDesign, link: localePath(prefix, "/server/mvp-design") },
            { text: copy.pages.api, link: localePath(prefix, "/server/api") }
          ]
        }
      ],
      [localePath(prefix, "/client/")]: [
        {
          text: copy.sections.client,
          items: [
            { text: copy.pages.clientOverview, link: localePath(prefix, "/client/overview") },
            { text: copy.pages.jsClient, link: localePath(prefix, "/client/js-client") },
            { text: copy.pages.embedding, link: localePath(prefix, "/client/embedding") }
          ]
        }
      ],
      [localePath(prefix, "/examples/")]: [
        {
          text: copy.sections.examples,
          items: [
            { text: copy.pages.browserClient, link: localePath(prefix, "/examples/browser-client") },
            { text: copy.pages.nativeClient, link: localePath(prefix, "/examples/native-client") },
            { text: copy.pages.endToEnd, link: localePath(prefix, "/examples/end-to-end") }
          ]
        }
      ],
      [localePath(prefix, "/playground/")]: [
        {
          text: copy.sections.playground,
          items: [{ text: copy.pages.playground, link: localePath(prefix, "/playground/") }]
        }
      ],
      [localePath(prefix, "/reference/")]: [
        {
          text: copy.sections.reference,
          items: [
            { text: copy.pages.glossary, link: localePath(prefix, "/reference/glossary") },
            { text: copy.pages.roadmap, link: localePath(prefix, "/reference/roadmap") }
          ]
        }
      ]
    },
    socialLinks: [{ icon: "github", link: "https://github.com/NWYLZW/mdp" }],
    outline: { label: copy.outlineLabel },
    lastUpdated: { text: copy.lastUpdatedText },
    docFooter: {
      prev: copy.docFooterPrev,
      next: copy.docFooterNext
    },
    darkModeSwitchLabel: copy.darkModeSwitchLabel,
    lightModeSwitchTitle: copy.lightModeSwitchTitle,
    darkModeSwitchTitle: copy.darkModeSwitchTitle,
    footer: {
      message: copy.footerMessage
    },
    sidebarMenuLabel: copy.sidebarMenuLabel,
    returnToTopLabel: copy.returnToTopLabel,
    langMenuLabel: copy.langMenuLabel
  };
}

function localePath(prefix: LocalePrefix, path: string): string {
  return prefix ? `${prefix}${path}` : path;
}

function resolveGitHubPagesBase(): string {
  const explicitBase = process.env.VITEPRESS_BASE;
  if (explicitBase) {
    return normalizeBase(explicitBase);
  }

  const repository = process.env.GITHUB_REPOSITORY?.split("/")[1];
  const owner = process.env.GITHUB_REPOSITORY_OWNER;

  if (!repository || !owner) {
    return "/";
  }

  if (repository.toLowerCase() === `${owner.toLowerCase()}.github.io`) {
    return "/";
  }

  return normalizeBase(`/${repository}/`);
}

function normalizeBase(value: string): string {
  let normalized = value.trim();

  if (!normalized.startsWith("/")) {
    normalized = `/${normalized}`;
  }

  if (!normalized.endsWith("/")) {
    normalized = `${normalized}/`;
  }

  return normalized;
}
