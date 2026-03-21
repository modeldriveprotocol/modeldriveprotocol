import { defineConfig, type DefaultTheme } from "vitepress";

type LocalePrefix = "" | "/zh-Hans";

interface LocaleCopy {
  nav: {
    docs: string;
    ecosystem: string;
    playground: string;
  };
  sections: {
    gettingStarted: string;
    aboutMdp: string;
    server: string;
    sdks: string;
    javaScript: string;
    apps: string;
    playground: string;
  };
  pages: {
    quickStart: string;
    whatIsMdp: string;
    architecture: string;
    serverTools: string;
    serverApis: string;
    serverSecurity: string;
    serverProtocol: string;
    jsQuickStart: string;
    jsUsage: string;
    jsMcpDefinitions: string;
    jsSkillsDefinitions: string;
    chromeExtension: string;
    vscodeExtension: string;
    jetbrainsPlugin: string;
    playground: string;
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
    docs: "Docs",
    ecosystem: "Ecosystem",
    playground: "Playground"
  },
  sections: {
    gettingStarted: "Getting Started",
    aboutMdp: "About MDP",
    server: "Server",
    sdks: "SDKs",
    javaScript: "JavaScript",
    apps: "Apps",
    playground: "Playground"
  },
  pages: {
    quickStart: "Quick Start",
    whatIsMdp: "What Is MDP?",
    architecture: "Architecture",
    serverTools: "Tools",
    serverApis: "APIs",
    serverSecurity: "Security",
    serverProtocol: "Protocol",
    jsQuickStart: "Quick Start",
    jsUsage: "Usage",
    jsMcpDefinitions: "MCP Definitions",
    jsSkillsDefinitions: "Skills Definitions",
    chromeExtension: "Chrome Extension",
    vscodeExtension: "VSCode Extension",
    jetbrainsPlugin: "JetBrains Plugin",
    playground: "Playground"
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
    docs: "文档",
    ecosystem: "生态",
    playground: "Playground"
  },
  sections: {
    gettingStarted: "起步",
    aboutMdp: "关于 MDP",
    server: "Server",
    sdks: "SDKs",
    javaScript: "JavaScript",
    apps: "Apps",
    playground: "Playground"
  },
  pages: {
    quickStart: "快速使用",
    whatIsMdp: "什么是 MDP？",
    architecture: "架构",
    serverTools: "Tools",
    serverApis: "APIs",
    serverSecurity: "安全",
    serverProtocol: "protocol",
    jsQuickStart: "简易上手",
    jsUsage: "如何使用",
    jsMcpDefinitions: "MCP 定义",
    jsSkillsDefinitions: "Skills 定义",
    chromeExtension: "Chrome 插件",
    vscodeExtension: "VSCode 插件",
    jetbrainsPlugin: "JetBrains 插件",
    playground: "Playground"
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
  head: [["link", { rel: "icon", type: "image/svg+xml", href: "/icon.svg" }]],
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
  const docsSidebar = createDocsSidebar(prefix, copy);
  const ecosystemSidebar = createEcosystemSidebar(prefix, copy);

  return {
    logo: "/icon.svg",
    nav: [
      {
        text: copy.nav.docs,
        link: localePath(prefix, "/guide/quick-start"),
        activeMatch: createActiveMatch(prefix, ["guide", "server", "protocol"]),
        items: [
          {
            text: copy.sections.gettingStarted,
            items: [
              { text: copy.pages.quickStart, link: localePath(prefix, "/guide/quick-start") },
              { text: copy.pages.whatIsMdp, link: localePath(prefix, "/guide/introduction") }
            ]
          },
          {
            text: copy.sections.aboutMdp,
            items: [
              { text: copy.pages.architecture, link: localePath(prefix, "/guide/architecture") }
            ]
          },
          {
            text: copy.sections.server,
            items: [
              { text: copy.pages.serverTools, link: localePath(prefix, "/server/tools") },
              { text: copy.pages.serverApis, link: localePath(prefix, "/server/api") },
              { text: copy.pages.serverSecurity, link: localePath(prefix, "/server/security") },
              { text: copy.pages.serverProtocol, link: localePath(prefix, "/server/protocol") }
            ]
          }
        ]
      },
      {
        text: copy.nav.ecosystem,
        link: localePath(prefix, "/sdk/javascript/quick-start"),
        activeMatch: createActiveMatch(prefix, ["sdk", "apps", "client", "examples"]),
        items: [
          {
            text: copy.sections.sdks,
            items: [
              {
                text: `${copy.sections.javaScript} / ${copy.pages.jsQuickStart}`,
                link: localePath(prefix, "/sdk/javascript/quick-start")
              },
              {
                text: `${copy.sections.javaScript} / ${copy.pages.jsUsage}`,
                link: localePath(prefix, "/sdk/javascript/usage")
              },
              {
                text: `${copy.sections.javaScript} / ${copy.pages.jsMcpDefinitions}`,
                link: localePath(prefix, "/sdk/javascript/mcp-definitions")
              },
              {
                text: `${copy.sections.javaScript} / ${copy.pages.jsSkillsDefinitions}`,
                link: localePath(prefix, "/sdk/javascript/skills-definitions")
              }
            ]
          },
          {
            text: copy.sections.apps,
            items: [
              {
                text: copy.pages.chromeExtension,
                link: localePath(prefix, "/apps/chrome-extension")
              },
              {
                text: copy.pages.vscodeExtension,
                link: localePath(prefix, "/apps/vscode-extension")
              },
              {
                text: copy.pages.jetbrainsPlugin,
                link: localePath(prefix, "/apps/jetbrains-plugin")
              }
            ]
          }
        ]
      },
      { text: copy.nav.playground, link: localePath(prefix, "/playground/") }
    ],
    sidebar: {
      [localePath(prefix, "/guide/")]: docsSidebar,
      [localePath(prefix, "/server/")]: docsSidebar,
      [localePath(prefix, "/protocol/")]: docsSidebar,
      [localePath(prefix, "/sdk/")]: ecosystemSidebar,
      [localePath(prefix, "/apps/")]: ecosystemSidebar,
      [localePath(prefix, "/client/")]: ecosystemSidebar,
      [localePath(prefix, "/examples/")]: ecosystemSidebar,
      [localePath(prefix, "/playground/")]: [
        {
          text: copy.sections.playground,
          items: [{ text: copy.pages.playground, link: localePath(prefix, "/playground/") }]
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

function createDocsSidebar(prefix: LocalePrefix, copy: LocaleCopy): DefaultTheme.SidebarItem[] {
  return [
    {
      text: copy.sections.gettingStarted,
      items: [
        { text: copy.pages.quickStart, link: localePath(prefix, "/guide/quick-start") },
        { text: copy.pages.whatIsMdp, link: localePath(prefix, "/guide/introduction") }
      ]
    },
    {
      text: copy.sections.aboutMdp,
      items: [{ text: copy.pages.architecture, link: localePath(prefix, "/guide/architecture") }]
    },
    {
      text: copy.sections.server,
      items: [
        { text: copy.pages.serverTools, link: localePath(prefix, "/server/tools") },
        { text: copy.pages.serverApis, link: localePath(prefix, "/server/api") },
        { text: copy.pages.serverSecurity, link: localePath(prefix, "/server/security") },
        { text: copy.pages.serverProtocol, link: localePath(prefix, "/server/protocol") }
      ]
    }
  ];
}

function createEcosystemSidebar(
  prefix: LocalePrefix,
  copy: LocaleCopy
): DefaultTheme.SidebarItem[] {
  return [
    {
      text: copy.sections.sdks,
      items: [
        {
          text: copy.sections.javaScript,
          items: [
            { text: copy.pages.jsQuickStart, link: localePath(prefix, "/sdk/javascript/quick-start") },
            { text: copy.pages.jsUsage, link: localePath(prefix, "/sdk/javascript/usage") },
            {
              text: copy.pages.jsMcpDefinitions,
              link: localePath(prefix, "/sdk/javascript/mcp-definitions")
            },
            {
              text: copy.pages.jsSkillsDefinitions,
              link: localePath(prefix, "/sdk/javascript/skills-definitions")
            }
          ]
        }
      ]
    },
    {
      text: copy.sections.apps,
      items: [
        { text: copy.pages.chromeExtension, link: localePath(prefix, "/apps/chrome-extension") },
        { text: copy.pages.vscodeExtension, link: localePath(prefix, "/apps/vscode-extension") },
        { text: copy.pages.jetbrainsPlugin, link: localePath(prefix, "/apps/jetbrains-plugin") }
      ]
    }
  ];
}

function createActiveMatch(prefix: LocalePrefix, segments: string[]): string {
  const roots = segments.join("|");
  return prefix ? `^${prefix}/(${roots})/` : `^/(${roots})/`;
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
