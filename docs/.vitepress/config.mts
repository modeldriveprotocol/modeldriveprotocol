import { type DefaultTheme, defineConfig } from 'vitepress'
import llmstxt from 'vitepress-plugin-llms'

type LocalePrefix = '' | '/zh-Hans'

interface LocaleCopy {
  nav: {
    docs: string
    blog: string
    contributing: string
    ecosystem: string
    playground: string
  }
  sections: {
    gettingStarted: string
    aboutMdp: string
    examples: string
    blog: string
    contributing: string
    howToContribute: string
    howToRelease: string
    server: string
    tools: string
    apis: string
    connection: string
    messageEvents: string
    externalInterfaces: string
    sdks: string
    javaScript: string
    apps: string
    playground: string
  }
  pages: {
    quickStart: string
    whatIsMdp: string
    architecture: string
    browserClientExample: string
    piAgentAssistantExample: string
    whyICreatedThisProject: string
    serverOverview: string
    serverDeployment: string
    serverCli: string
    toolsOverview: string
    listClients: string
    listTools: string
    listPrompts: string
    listSkills: string
    listResources: string
    callTools: string
    getPrompt: string
    callSkills: string
    readResource: string
    callClients: string
    apisOverview: string
    websocketConnection: string
    httpLoopConnection: string
    authBootstrap: string
    httpLoopConnect: string
    httpLoopSend: string
    httpLoopPoll: string
    httpLoopDisconnect: string
    authIssue: string
    authDelete: string
    skillRouteDirect: string
    skillRouteNested: string
    registerClient: string
    updateClientCapabilities: string
    unregisterClient: string
    callClient: string
    callClientResult: string
    ping: string
    pong: string
    serverSecurity: string
    serverProtocol: string
    contributingOverview: string
    contributingArchitecture: string
    contributingModules: string
    contributingSetup: string
    contributingSetupOverview: string
    contributingSetupNodeJs: string
    contributingProtocol: string
    contributingServer: string
    contributingSdks: string
    contributingJavaScriptSdk: string
    contributingApps: string
    contributingChromeExtension: string
    contributingVsCodeExtension: string
    contributingReleasingOverview: string
    contributingReleasingPackages: string
    contributingReleasingApps: string
    jsQuickStart: string
    jsUsage: string
    jsMcpDefinitions: string
    jsSkillsDefinitions: string
    chromeExtension: string
    vscodeExtension: string
    jetbrainsPlugin: string
    playground: string
  }
  footerMessage: string
  editLinkText: string
  outlineLabel: string
  lastUpdatedText: string
  docFooterPrev: string
  docFooterNext: string
  darkModeSwitchLabel: string
  lightModeSwitchTitle: string
  darkModeSwitchTitle: string
  sidebarMenuLabel: string
  returnToTopLabel: string
  langMenuLabel: string
  search: {
    buttonText: string
    buttonAriaLabel: string
    noResultsText: string
    resetButtonTitle: string
    backButtonTitle: string
    displayDetails: string
    footer: {
      selectText: string
      selectKeyAriaLabel: string
      navigateText: string
      navigateUpKeyAriaLabel: string
      navigateDownKeyAriaLabel: string
      closeText: string
      closeKeyAriaLabel: string
    }
    sidebarPlaceholder: string
    sidebarNoResults: string
  }
}

const base = resolveGitHubPagesBase()
const repositoryUrl = resolveRepositoryUrl()

const enUS: LocaleCopy = {
  nav: {
    docs: 'Docs',
    blog: 'Blog',
    contributing: 'Contributing',
    ecosystem: 'Ecosystem',
    playground: 'Playground'
  },
  sections: {
    gettingStarted: 'Getting Started',
    aboutMdp: 'About MDP',
    examples: 'Examples',
    blog: 'Blog',
    contributing: 'Contributing',
    howToContribute: 'How to Contribute',
    howToRelease: 'How to Release',
    server: 'Server',
    tools: 'Tools',
    apis: 'APIs',
    connection: 'Connection Setup',
    messageEvents: 'Message Events',
    externalInterfaces: 'External Interfaces',
    sdks: 'SDKs',
    javaScript: 'JavaScript',
    apps: 'Apps',
    playground: 'Playground'
  },
  pages: {
    quickStart: 'Quick Start',
    whatIsMdp: 'What Is MDP?',
    architecture: 'Architecture',
    browserClientExample: 'Browser Client',
    piAgentAssistantExample: 'Pi Agent Assistant',
    whyICreatedThisProject: 'Why I Created This Project',
    serverOverview: 'Overview',
    serverDeployment: 'Deployment Modes',
    serverCli: 'CLI Reference',
    toolsOverview: 'Overview',
    listClients: 'listClients',
    listTools: 'listTools',
    listPrompts: 'listPrompts',
    listSkills: 'listSkills',
    listResources: 'listResources',
    callTools: 'callTools',
    getPrompt: 'getPrompt',
    callSkills: 'callSkills',
    readResource: 'readResource',
    callClients: 'callClients',
    apisOverview: 'Overview',
    websocketConnection: 'WebSocket',
    httpLoopConnection: 'HTTP Loop',
    authBootstrap: 'Auth Bootstrap',
    httpLoopConnect: 'POST /mdp/http-loop/connect',
    httpLoopSend: 'POST /mdp/http-loop/send',
    httpLoopPoll: 'GET /mdp/http-loop/poll',
    httpLoopDisconnect: 'POST /mdp/http-loop/disconnect',
    authIssue: 'POST /mdp/auth',
    authDelete: 'DELETE /mdp/auth',
    skillRouteDirect: 'GET /skills/:clientId/*skillPath',
    skillRouteNested: 'GET /:clientId/skills/*skillPath',
    registerClient: 'registerClient',
    updateClientCapabilities: 'updateClientCapabilities',
    unregisterClient: 'unregisterClient',
    callClient: 'callClient',
    callClientResult: 'callClientResult',
    ping: 'ping',
    pong: 'pong',
    serverSecurity: 'Security',
    serverProtocol: 'Protocol Reference',
    contributingOverview: 'Contributing',
    contributingArchitecture: 'Project Architecture',
    contributingModules: 'Modules',
    contributingSetup: 'Environment Setup',
    contributingSetupOverview: 'Environment Overview',
    contributingSetupNodeJs: 'Node.js',
    contributingProtocol: 'Protocol',
    contributingServer: 'Server',
    contributingSdks: 'SDKs',
    contributingJavaScriptSdk: 'JavaScript SDK',
    contributingApps: 'Apps',
    contributingChromeExtension: 'Chrome Extension Guide',
    contributingVsCodeExtension: 'VSCode Extension Guide',
    contributingReleasingOverview: 'Releasing Overview',
    contributingReleasingPackages: 'NPM Packages',
    contributingReleasingApps: 'Apps',
    jsQuickStart: 'Quick Start',
    jsUsage: 'Usage',
    jsMcpDefinitions: 'MCP Definitions',
    jsSkillsDefinitions: 'Skills Definitions',
    chromeExtension: 'Chrome Extension',
    vscodeExtension: 'VSCode Extension',
    jetbrainsPlugin: 'JetBrains Plugin',
    playground: 'Playground'
  },
  footerMessage: 'Model Drive Protocol',
  editLinkText: 'Edit this page on GitHub',
  outlineLabel: 'On this page',
  lastUpdatedText: 'Last updated',
  docFooterPrev: 'Previous page',
  docFooterNext: 'Next page',
  darkModeSwitchLabel: 'Appearance',
  lightModeSwitchTitle: 'Switch to light theme',
  darkModeSwitchTitle: 'Switch to dark theme',
  sidebarMenuLabel: 'Menu',
  returnToTopLabel: 'Return to top',
  langMenuLabel: 'Change language',
  search: {
    buttonText: 'Search',
    buttonAriaLabel: 'Search docs',
    noResultsText: 'No relevant pages found',
    resetButtonTitle: 'Clear search',
    backButtonTitle: 'Close search',
    displayDetails: 'Display detailed list',
    footer: {
      selectText: 'Select',
      selectKeyAriaLabel: 'Enter key',
      navigateText: 'Navigate',
      navigateUpKeyAriaLabel: 'Up arrow key',
      navigateDownKeyAriaLabel: 'Down arrow key',
      closeText: 'Close',
      closeKeyAriaLabel: 'Escape key'
    },
    sidebarPlaceholder: 'Filter this section',
    sidebarNoResults: 'No sidebar entries matched'
  }
}

const zhHans: LocaleCopy = {
  nav: {
    docs: '文档',
    blog: '博客',
    contributing: '共建',
    ecosystem: '生态',
    playground: 'Playground'
  },
  sections: {
    gettingStarted: '起步',
    aboutMdp: '关于 MDP',
    examples: '示例',
    blog: '博客',
    contributing: '共建',
    howToContribute: '如何共建',
    howToRelease: '如何发布',
    server: '服务端',
    tools: '工具集',
    apis: '对外接口',
    connection: '建立链接',
    messageEvents: '消息事件',
    externalInterfaces: '外部接口',
    sdks: 'SDKs',
    javaScript: 'JavaScript',
    apps: 'Apps',
    playground: 'Playground'
  },
  pages: {
    quickStart: '快速使用',
    whatIsMdp: '什么是 MDP？',
    architecture: '架构',
    browserClientExample: '浏览器客户端',
    piAgentAssistantExample: 'Pi Agent Assistant',
    whyICreatedThisProject: '我为什么创建了这个项目',
    serverOverview: '总览',
    serverDeployment: '部署模式',
    serverCli: 'CLI 参数',
    toolsOverview: '总览',
    listClients: 'listClients',
    listTools: 'listTools',
    listPrompts: 'listPrompts',
    listSkills: 'listSkills',
    listResources: 'listResources',
    callTools: 'callTools',
    getPrompt: 'getPrompt',
    callSkills: 'callSkills',
    readResource: 'readResource',
    callClients: 'callClients',
    apisOverview: '总览',
    websocketConnection: 'WebSocket 建立链接',
    httpLoopConnection: 'HTTP Loop 建立链接',
    authBootstrap: '鉴权引导',
    httpLoopConnect: 'POST /mdp/http-loop/connect',
    httpLoopSend: 'POST /mdp/http-loop/send',
    httpLoopPoll: 'GET /mdp/http-loop/poll',
    httpLoopDisconnect: 'POST /mdp/http-loop/disconnect',
    authIssue: 'POST /mdp/auth',
    authDelete: 'DELETE /mdp/auth',
    skillRouteDirect: 'GET /skills/:clientId/*skillPath',
    skillRouteNested: 'GET /:clientId/skills/*skillPath',
    registerClient: 'registerClient',
    updateClientCapabilities: 'updateClientCapabilities',
    unregisterClient: 'unregisterClient',
    callClient: 'callClient',
    callClientResult: 'callClientResult',
    ping: 'ping',
    pong: 'pong',
    serverSecurity: '安全',
    serverProtocol: '协议标准',
    contributingOverview: '共建指南',
    contributingArchitecture: '项目架构',
    contributingModules: '模块',
    contributingSetup: '环境准备',
    contributingSetupOverview: '环境介绍',
    contributingSetupNodeJs: 'Node.js',
    contributingProtocol: '协议',
    contributingServer: '服务端',
    contributingSdks: 'SDKs',
    contributingJavaScriptSdk: 'JavaScript SDK',
    contributingApps: '应用',
    contributingChromeExtension: 'Chrome 插件开发指南',
    contributingVsCodeExtension: 'VSCode 插件开发指南',
    contributingReleasingOverview: '发布总览',
    contributingReleasingPackages: 'NPM 包发布',
    contributingReleasingApps: '应用发布',
    jsQuickStart: '简易上手',
    jsUsage: '如何使用',
    jsMcpDefinitions: 'MCP 定义',
    jsSkillsDefinitions: 'Skills 定义',
    chromeExtension: 'Chrome 插件',
    vscodeExtension: 'VSCode 插件',
    jetbrainsPlugin: 'JetBrains 插件',
    playground: 'Playground'
  },
  footerMessage: '模型驱动协议',
  editLinkText: '在 GitHub 上编辑此页',
  outlineLabel: '本页导航',
  lastUpdatedText: '最后更新',
  docFooterPrev: '上一页',
  docFooterNext: '下一页',
  darkModeSwitchLabel: '外观',
  lightModeSwitchTitle: '切换到浅色主题',
  darkModeSwitchTitle: '切换到暗色主题',
  sidebarMenuLabel: '目录',
  returnToTopLabel: '返回顶部',
  langMenuLabel: '切换语言',
  search: {
    buttonText: '搜索',
    buttonAriaLabel: '搜索文档',
    noResultsText: '没有找到相关页面',
    resetButtonTitle: '清除搜索',
    backButtonTitle: '关闭搜索',
    displayDetails: '显示详细列表',
    footer: {
      selectText: '选择',
      selectKeyAriaLabel: '回车键',
      navigateText: '切换',
      navigateUpKeyAriaLabel: '上方向键',
      navigateDownKeyAriaLabel: '下方向键',
      closeText: '关闭',
      closeKeyAriaLabel: 'Esc 键'
    },
    sidebarPlaceholder: '筛选当前目录',
    sidebarNoResults: '目录中没有匹配项'
  }
}

export default defineConfig({
  title: 'MDP',
  description: 'Model Drive Protocol documentation',
  base,
  cleanUrls: true,
  lastUpdated: true,
  appearance: true,
  vite: {
    plugins: [llmstxt()]
  },
  themeConfig: {
    search: {
      provider: 'local'
    }
  },
  markdown: {
    config(md) {
      const defaultFence = md.renderer.rules.fence

      md.renderer.rules.fence = (tokens, idx, options, env, self) => {
        const token = tokens[idx]
        const language = token.info.trim().split(/\s+/u)[0]

        if (language === 'mermaid') {
          return `<MermaidDiagram code="${encodeURIComponent(token.content)}" />`
        }

        return defaultFence
          ? defaultFence(tokens, idx, options, env, self)
          : self.renderToken(tokens, idx, options)
      }
    }
  },
  head: [['link', { rel: 'icon', type: 'image/svg+xml', href: '/icon.svg' }]],
  locales: {
    root: {
      label: 'en-US',
      lang: 'en-US',
      title: 'MDP',
      description: 'Model Drive Protocol documentation',
      themeConfig: createThemeConfig('', enUS)
    },
    'zh-Hans': {
      label: 'zh-Hans',
      lang: 'zh-Hans',
      link: '/zh-Hans/',
      title: 'MDP',
      description: 'Model Drive Protocol 文档',
      themeConfig: createThemeConfig('/zh-Hans', zhHans)
    }
  }
})

function createThemeConfig(prefix: LocalePrefix, copy: LocaleCopy): DefaultTheme.Config {
  const docsSidebar = createDocsSidebar(prefix, copy)
  const examplesSidebar = createExamplesSidebar(prefix, copy)
  const blogSidebar = createBlogSidebar(prefix, copy)
  const contributingSidebar = createContributingSidebar(prefix, copy)
  const ecosystemSidebar = createEcosystemSidebar(prefix, copy)

  return {
    logo: '/icon.svg',
    nav: [
      {
        text: copy.nav.docs,
        link: localePath(prefix, '/guide/quick-start'),
        activeMatch: createActiveMatch(prefix, ['guide', 'server', 'protocol', 'examples']),
        items: [
          {
            text: copy.sections.gettingStarted,
            items: [
              { text: copy.pages.quickStart, link: localePath(prefix, '/guide/quick-start') },
              { text: copy.pages.whatIsMdp, link: localePath(prefix, '/guide/introduction') }
            ]
          },
          {
            text: copy.sections.aboutMdp,
            items: [{ text: copy.pages.architecture, link: localePath(prefix, '/guide/architecture') }]
          },
          {
            text: copy.sections.examples,
            items: [
              {
                text: copy.pages.browserClientExample,
                link: localePath(prefix, '/examples/browser-client')
              },
              {
                text: copy.pages.piAgentAssistantExample,
                link: localePath(prefix, '/examples/pi-agent-assistant')
              }
            ]
          },
          {
            text: copy.sections.server,
            items: [
              { text: copy.pages.serverOverview, link: localePath(prefix, '/server/overview') },
              { text: copy.pages.serverDeployment, link: localePath(prefix, '/server/deployment') },
              { text: copy.pages.serverCli, link: localePath(prefix, '/server/cli') },
              { text: copy.sections.tools, link: localePath(prefix, '/server/tools/') },
              { text: copy.sections.apis, link: localePath(prefix, '/server/api/') },
              { text: copy.pages.serverSecurity, link: localePath(prefix, '/server/security') },
              { text: copy.pages.serverProtocol, link: localePath(prefix, '/server/protocol') }
            ]
          }
        ]
      },
      {
        text: copy.nav.ecosystem,
        link: localePath(prefix, '/sdk/javascript/quick-start'),
        activeMatch: createActiveMatch(prefix, ['sdk', 'apps', 'client']),
        items: [
          {
            text: copy.sections.sdks,
            items: [
              {
                text: `${copy.sections.javaScript} / ${copy.pages.jsQuickStart}`,
                link: localePath(prefix, '/sdk/javascript/quick-start')
              },
              {
                text: `${copy.sections.javaScript} / ${copy.pages.jsUsage}`,
                link: localePath(prefix, '/sdk/javascript/usage')
              },
              {
                text: `${copy.sections.javaScript} / ${copy.pages.jsMcpDefinitions}`,
                link: localePath(prefix, '/sdk/javascript/mcp-definitions')
              },
              {
                text: `${copy.sections.javaScript} / ${copy.pages.jsSkillsDefinitions}`,
                link: localePath(prefix, '/sdk/javascript/skills-definitions')
              }
            ]
          },
          {
            text: copy.sections.apps,
            items: [
              { text: copy.pages.chromeExtension, link: localePath(prefix, '/apps/chrome-extension') },
              { text: copy.pages.vscodeExtension, link: localePath(prefix, '/apps/vscode-extension') },
              { text: copy.pages.jetbrainsPlugin, link: localePath(prefix, '/apps/jetbrains-plugin') }
            ]
          }
        ]
      },
      { text: copy.nav.playground, link: localePath(prefix, '/playground/') },
      {
        text: copy.nav.contributing,
        link: localePath(prefix, '/contributing/'),
        activeMatch: createActiveMatch(prefix, ['contributing']),
        items: [
          {
            text: copy.sections.howToContribute,
            items: [
              { text: copy.pages.contributingOverview, link: localePath(prefix, '/contributing/') },
              {
                text: copy.pages.contributingArchitecture,
                link: localePath(prefix, '/contributing/architecture')
              },
              {
                text: copy.pages.contributingSetup,
                link: localePath(prefix, '/contributing/setup/')
              },
              {
                text: copy.pages.contributingModules,
                link: localePath(prefix, '/contributing/modules/protocol')
              }
            ]
          },
          {
            text: copy.sections.howToRelease,
            items: [
              {
                text: copy.pages.contributingReleasingOverview,
                link: localePath(prefix, '/contributing/releasing')
              },
              {
                text: copy.pages.contributingReleasingPackages,
                link: localePath(prefix, '/contributing/releasing-packages')
              },
              {
                text: copy.pages.contributingReleasingApps,
                link: localePath(prefix, '/contributing/releasing-apps')
              }
            ]
          }
        ]
      },
      {
        text: copy.nav.blog,
        link: localePath(prefix, '/blog/why-i-created-this-project'),
        activeMatch: createActiveMatch(prefix, ['blog']),
        items: [
          {
            text: copy.sections.blog,
            items: [
              {
                text: copy.pages.whyICreatedThisProject,
                link: localePath(prefix, '/blog/why-i-created-this-project')
              }
            ]
          }
        ]
      }
    ],
    sidebar: {
      [localePath(prefix, '/guide/')]: docsSidebar,
      [localePath(prefix, '/server/')]: docsSidebar,
      [localePath(prefix, '/protocol/')]: docsSidebar,
      [localePath(prefix, '/blog/')]: blogSidebar,
      [localePath(prefix, '/contributing/')]: contributingSidebar,
      [localePath(prefix, '/sdk/')]: ecosystemSidebar,
      [localePath(prefix, '/apps/')]: ecosystemSidebar,
      [localePath(prefix, '/client/')]: ecosystemSidebar,
      [localePath(prefix, '/examples/')]: docsSidebar,
      [localePath(prefix, '/playground/')]: [
        {
          text: copy.sections.playground,
          items: [{ text: copy.pages.playground, link: localePath(prefix, '/playground/') }]
        }
      ]
    },
    socialLinks: [{ icon: 'github', link: repositoryUrl }],
    editLink: {
      pattern: `${repositoryUrl}/edit/main/docs/:path`,
      text: copy.editLinkText
    },
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
    search: {
      provider: 'local',
      options: {
        translations: {
          button: {
            buttonText: copy.search.buttonText,
            buttonAriaLabel: copy.search.buttonAriaLabel
          },
          modal: {
            noResultsText: copy.search.noResultsText,
            resetButtonTitle: copy.search.resetButtonTitle,
            backButtonTitle: copy.search.backButtonTitle,
            displayDetails: copy.search.displayDetails,
            footer: copy.search.footer
          }
        }
      }
    },
    sidebarMenuLabel: copy.sidebarMenuLabel,
    returnToTopLabel: copy.returnToTopLabel,
    langMenuLabel: copy.langMenuLabel
  }
}

function createBlogSidebar(prefix: LocalePrefix, copy: LocaleCopy): DefaultTheme.SidebarItem[] {
  return [
    {
      text: copy.sections.blog,
      collapsed: true,
      items: [
        {
          text: copy.pages.whyICreatedThisProject,
          link: localePath(prefix, '/blog/why-i-created-this-project')
        }
      ]
    }
  ]
}

function createDocsSidebar(prefix: LocalePrefix, copy: LocaleCopy): DefaultTheme.SidebarItem[] {
  return [
    {
      text: copy.sections.gettingStarted,
      collapsed: true,
      items: [
        { text: copy.pages.quickStart, link: localePath(prefix, '/guide/quick-start') },
        { text: copy.pages.whatIsMdp, link: localePath(prefix, '/guide/introduction') }
      ]
    },
    {
      text: copy.sections.aboutMdp,
      collapsed: true,
      items: [{ text: copy.pages.architecture, link: localePath(prefix, '/guide/architecture') }]
    },
    {
      text: copy.sections.server,
      collapsed: true,
      items: [
        { text: copy.pages.serverOverview, link: localePath(prefix, '/server/overview') },
        { text: copy.pages.serverDeployment, link: localePath(prefix, '/server/deployment') },
        { text: copy.pages.serverCli, link: localePath(prefix, '/server/cli') },
        {
          text: copy.sections.tools,
          collapsed: true,
          items: [
            { text: copy.pages.toolsOverview, link: localePath(prefix, '/server/tools/') },
            { text: copy.pages.listClients, link: localePath(prefix, '/server/tools/list-clients') },
            { text: copy.pages.listTools, link: localePath(prefix, '/server/tools/list-tools') },
            { text: copy.pages.listPrompts, link: localePath(prefix, '/server/tools/list-prompts') },
            { text: copy.pages.listSkills, link: localePath(prefix, '/server/tools/list-skills') },
            { text: copy.pages.listResources, link: localePath(prefix, '/server/tools/list-resources') },
            { text: copy.pages.callTools, link: localePath(prefix, '/server/tools/call-tools') },
            { text: copy.pages.getPrompt, link: localePath(prefix, '/server/tools/get-prompt') },
            { text: copy.pages.callSkills, link: localePath(prefix, '/server/tools/call-skills') },
            { text: copy.pages.readResource, link: localePath(prefix, '/server/tools/read-resource') },
            { text: copy.pages.callClients, link: localePath(prefix, '/server/tools/call-clients') }
          ]
        },
        {
          text: copy.sections.apis,
          collapsed: true,
          items: [
            { text: copy.pages.apisOverview, link: localePath(prefix, '/server/api/') },
            {
              text: copy.sections.connection,
              collapsed: true,
              items: [
                {
                  text: copy.pages.websocketConnection,
                  link: localePath(prefix, '/server/api/websocket-connection')
                },
                {
                  text: copy.pages.httpLoopConnection,
                  link: localePath(prefix, '/server/api/http-loop-connection')
                },
                {
                  text: copy.pages.authBootstrap,
                  link: localePath(prefix, '/server/api/auth-bootstrap')
                }
              ]
            },
            {
              text: copy.sections.messageEvents,
              collapsed: true,
              items: [
                {
                  text: copy.pages.registerClient,
                  link: localePath(prefix, '/server/api/register-client')
                },
                {
                  text: copy.pages.updateClientCapabilities,
                  link: localePath(prefix, '/server/api/update-client-capabilities')
                },
                {
                  text: copy.pages.unregisterClient,
                  link: localePath(prefix, '/server/api/unregister-client')
                },
                {
                  text: copy.pages.callClient,
                  link: localePath(prefix, '/server/api/call-client')
                },
                {
                  text: copy.pages.callClientResult,
                  link: localePath(prefix, '/server/api/call-client-result')
                },
                { text: copy.pages.ping, link: localePath(prefix, '/server/api/ping') },
                { text: copy.pages.pong, link: localePath(prefix, '/server/api/pong') }
              ]
            },
            {
              text: copy.sections.externalInterfaces,
              collapsed: true,
              items: [
                {
                  text: copy.pages.httpLoopConnect,
                  link: localePath(prefix, '/server/api/http-loop-connect')
                },
                {
                  text: copy.pages.httpLoopSend,
                  link: localePath(prefix, '/server/api/http-loop-send')
                },
                {
                  text: copy.pages.httpLoopPoll,
                  link: localePath(prefix, '/server/api/http-loop-poll')
                },
                {
                  text: copy.pages.httpLoopDisconnect,
                  link: localePath(prefix, '/server/api/http-loop-disconnect')
                },
                {
                  text: copy.pages.authIssue,
                  link: localePath(prefix, '/server/api/auth-issue')
                },
                {
                  text: copy.pages.authDelete,
                  link: localePath(prefix, '/server/api/auth-delete')
                },
                {
                  text: copy.pages.skillRouteDirect,
                  link: localePath(prefix, '/server/api/skill-route-direct')
                },
                {
                  text: copy.pages.skillRouteNested,
                  link: localePath(prefix, '/server/api/skill-route-nested')
                }
              ]
            }
          ]
        },
        { text: copy.pages.serverSecurity, link: localePath(prefix, '/server/security') },
        { text: copy.pages.serverProtocol, link: localePath(prefix, '/server/protocol') }
      ]
    },
    {
      text: copy.sections.examples,
      collapsed: true,
      items: [
        {
          text: copy.pages.browserClientExample,
          link: localePath(prefix, '/examples/browser-client')
        },
        {
          text: copy.pages.piAgentAssistantExample,
          link: localePath(prefix, '/examples/pi-agent-assistant')
        }
      ]
    }
  ]
}

function createExamplesSidebar(prefix: LocalePrefix, copy: LocaleCopy): DefaultTheme.SidebarItem[] {
  return [
    {
      text: copy.sections.examples,
      collapsed: true,
      items: [
        {
          text: copy.pages.browserClientExample,
          link: localePath(prefix, '/examples/browser-client')
        },
        {
          text: copy.pages.piAgentAssistantExample,
          link: localePath(prefix, '/examples/pi-agent-assistant')
        }
      ]
    }
  ]
}

function createContributingSidebar(
  prefix: LocalePrefix,
  copy: LocaleCopy
): DefaultTheme.SidebarItem[] {
  return [
    {
      text: copy.sections.howToContribute,
      collapsed: true,
      items: [
        { text: copy.pages.contributingOverview, link: localePath(prefix, '/contributing/') },
        {
          text: copy.pages.contributingArchitecture,
          link: localePath(prefix, '/contributing/architecture')
        },
        {
          text: copy.pages.contributingSetup,
          collapsed: true,
          items: [
            {
              text: copy.pages.contributingSetupOverview,
              link: localePath(prefix, '/contributing/setup/')
            },
            {
              text: copy.pages.contributingSetupNodeJs,
              link: localePath(prefix, '/contributing/setup/nodejs')
            }
          ]
        },
        {
          text: copy.pages.contributingModules,
          collapsed: true,
          items: [
            {
              text: copy.pages.contributingProtocol,
              link: localePath(prefix, '/contributing/modules/protocol')
            },
            {
              text: copy.pages.contributingServer,
              link: localePath(prefix, '/contributing/modules/server')
            },
            {
              text: copy.pages.contributingSdks,
              collapsed: true,
              items: [
                {
                  text: copy.pages.contributingJavaScriptSdk,
                  link: localePath(prefix, '/contributing/modules/sdks/javascript')
                }
              ]
            },
            {
              text: copy.pages.contributingApps,
              collapsed: true,
              items: [
                {
                  text: copy.pages.contributingChromeExtension,
                  link: localePath(prefix, '/contributing/modules/apps/chrome-extension')
                },
                {
                  text: copy.pages.contributingVsCodeExtension,
                  link: localePath(prefix, '/contributing/modules/apps/vscode-extension')
                }
              ]
            }
          ]
        }
      ]
    },
    {
      text: copy.sections.howToRelease,
      collapsed: true,
      items: [
        {
          text: copy.pages.contributingReleasingOverview,
          link: localePath(prefix, '/contributing/releasing')
        },
        {
          text: copy.pages.contributingReleasingPackages,
          link: localePath(prefix, '/contributing/releasing-packages')
        },
        {
          text: copy.pages.contributingReleasingApps,
          link: localePath(prefix, '/contributing/releasing-apps')
        }
      ]
    }
  ]
}

function createEcosystemSidebar(
  prefix: LocalePrefix,
  copy: LocaleCopy
): DefaultTheme.SidebarItem[] {
  return [
    {
      text: copy.sections.sdks,
      collapsed: true,
      items: [
        {
          text: copy.sections.javaScript,
          collapsed: true,
          items: [
            { text: copy.pages.jsQuickStart, link: localePath(prefix, '/sdk/javascript/quick-start') },
            { text: copy.pages.jsUsage, link: localePath(prefix, '/sdk/javascript/usage') },
            {
              text: copy.pages.jsMcpDefinitions,
              link: localePath(prefix, '/sdk/javascript/mcp-definitions')
            },
            {
              text: copy.pages.jsSkillsDefinitions,
              link: localePath(prefix, '/sdk/javascript/skills-definitions')
            }
          ]
        }
      ]
    },
    {
      text: copy.sections.apps,
      collapsed: true,
      items: [
        { text: copy.pages.chromeExtension, link: localePath(prefix, '/apps/chrome-extension') },
        { text: copy.pages.vscodeExtension, link: localePath(prefix, '/apps/vscode-extension') },
        { text: copy.pages.jetbrainsPlugin, link: localePath(prefix, '/apps/jetbrains-plugin') }
      ]
    }
  ]
}

function createActiveMatch(prefix: LocalePrefix, segments: string[]): string {
  const roots = segments.join('|')
  return prefix ? `^${prefix}/(${roots})/` : `^/(${roots})/`
}

function localePath(prefix: LocalePrefix, path: string): string {
  return prefix ? `${prefix}${path}` : path
}

function resolveGitHubPagesBase(): string {
  const explicitBase = process.env.VITEPRESS_BASE
  if (explicitBase) {
    return normalizeBase(explicitBase)
  }

  const repository = process.env.GITHUB_REPOSITORY?.split('/')[1]
  const owner = process.env.GITHUB_REPOSITORY_OWNER

  if (!repository || !owner) {
    return '/'
  }

  if (repository.toLowerCase() === `${owner.toLowerCase()}.github.io`) {
    return '/'
  }

  return normalizeBase(`/${repository}/`)
}

function normalizeBase(value: string): string {
  let normalized = value.trim()

  if (!normalized.startsWith('/')) {
    normalized = `/${normalized}`
  }

  if (!normalized.endsWith('/')) {
    normalized = `${normalized}/`
  }

  return normalized
}

function resolveRepositoryUrl(): string {
  const repository = process.env.GITHUB_REPOSITORY

  if (repository) {
    return `https://github.com/${repository}`
  }

  return 'https://github.com/modeldriveprotocol/modeldriveprotocol'
}
