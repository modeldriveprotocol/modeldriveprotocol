import {
  DEFAULT_CLUSTER_MODE,
  DEFAULT_DISCOVERY_ATTEMPTS,
  DEFAULT_DISCOVERY_HOST,
  DEFAULT_MDP_PORT,
  DEFAULT_SERVER_HOST
} from './defaults.js'

export type CliDocLocale = 'en' | 'zh-Hans'
export type CliOptionCategory = 'core' | 'cluster'

interface CliOptionDefinition {
  flags: string[]
  valueName?: string
  category: CliOptionCategory
  helpDescription: string
  markdownDescription: Record<CliDocLocale, string>
}

interface CliExampleDefinition {
  title: Record<CliDocLocale, string>
  command: string
}

const usageLine = 'modeldriveprotocol-server [options]'
const setupUsageLine = 'modeldriveprotocol-server setup [options]'

const optionDefinitions: CliOptionDefinition[] = [
  {
    flags: ['--host'],
    valueName: '<host>',
    category: 'core',
    helpDescription: `Bind host (default: ${DEFAULT_SERVER_HOST})`,
    markdownDescription: {
      en: `Bind host. Default: \`${DEFAULT_SERVER_HOST}\`.`,
      'zh-Hans': `绑定地址。默认：\`${DEFAULT_SERVER_HOST}\`。`
    }
  },
  {
    flags: ['--port'],
    valueName: '<port>',
    category: 'core',
    helpDescription: `Bind port (default: ${DEFAULT_MDP_PORT}; auto/proxy-required use 0 after upstream discovery when omitted)`,
    markdownDescription: {
      en: `Bind port. Default: \`${DEFAULT_MDP_PORT}\`. In auto and proxy-required mode, omitted \`--port\` falls back to \`0\` only after an upstream hub is discovered, so the edge can use an ephemeral free port.`,
      'zh-Hans': `绑定端口。默认：\`${DEFAULT_MDP_PORT}\`。在 auto 和 proxy-required 模式下，只有在发现上游 hub 之后，省略 \`--port\` 才会回退到 \`0\`，让 edge 自动拿一个空闲临时端口。`
    }
  },
  {
    flags: ['--tls-key'],
    valueName: '<path>',
    category: 'core',
    helpDescription: 'TLS private key path',
    markdownDescription: {
      en: 'TLS private key path.',
      'zh-Hans': 'TLS 私钥路径。'
    }
  },
  {
    flags: ['--tls-cert'],
    valueName: '<path>',
    category: 'core',
    helpDescription: 'TLS certificate path',
    markdownDescription: {
      en: 'TLS certificate path.',
      'zh-Hans': 'TLS 证书路径。'
    }
  },
  {
    flags: ['--tls-ca'],
    valueName: '<path>',
    category: 'core',
    helpDescription: 'TLS CA bundle path',
    markdownDescription: {
      en: 'Optional TLS CA bundle path.',
      'zh-Hans': '可选的 TLS CA bundle 路径。'
    }
  },
  {
    flags: ['--server-id'],
    valueName: '<id>',
    category: 'core',
    helpDescription: 'Stable server identity exposed in /mdp/meta',
    markdownDescription: {
      en: 'Stable server identity exposed by `/mdp/meta`.',
      'zh-Hans': '暴露在 `/mdp/meta` 里的稳定 server 身份。'
    }
  },
  {
    flags: ['-h', '--help'],
    category: 'core',
    helpDescription: 'Show this help text',
    markdownDescription: {
      en: 'Print help and exit.',
      'zh-Hans': '打印帮助并退出。'
    }
  },
  {
    flags: ['--cluster-mode'],
    valueName: '<standalone|auto|proxy-required>',
    category: 'cluster',
    helpDescription: `Startup topology mode (default: ${DEFAULT_CLUSTER_MODE})`,
    markdownDescription: {
      en: `Startup topology mode. Default: \`${DEFAULT_CLUSTER_MODE}\`.`,
      'zh-Hans': `启动拓扑模式。默认：\`${DEFAULT_CLUSTER_MODE}\`。`
    }
  },
  {
    flags: ['--upstream-url'],
    valueName: '<ws-url>',
    category: 'cluster',
    helpDescription: 'Explicit upstream hub websocket URL',
    markdownDescription: {
      en: 'Skip discovery and connect to one explicit upstream hub.',
      'zh-Hans': '跳过发现流程，直接连接一个显式指定的上游 hub。'
    }
  },
  {
    flags: ['--discover-host'],
    valueName: '<host>',
    category: 'cluster',
    helpDescription: `Discovery host (default: ${DEFAULT_DISCOVERY_HOST})`,
    markdownDescription: {
      en: `Discovery host. Default: \`${DEFAULT_DISCOVERY_HOST}\`.`,
      'zh-Hans': `发现流程使用的 host。默认：\`${DEFAULT_DISCOVERY_HOST}\`。`
    }
  },
  {
    flags: ['--discover-start-port'],
    valueName: '<port>',
    category: 'cluster',
    helpDescription: `First port to probe (default: ${DEFAULT_MDP_PORT})`,
    markdownDescription: {
      en: `First port to probe. Default: \`${DEFAULT_MDP_PORT}\`.`,
      'zh-Hans': `开始探测的首个端口。默认：\`${DEFAULT_MDP_PORT}\`。`
    }
  },
  {
    flags: ['--discover-attempts'],
    valueName: '<count>',
    category: 'cluster',
    helpDescription: `Number of consecutive ports to probe (default: ${DEFAULT_DISCOVERY_ATTEMPTS})`,
    markdownDescription: {
      en: `Number of consecutive ports to probe. Default: \`${DEFAULT_DISCOVERY_ATTEMPTS}\`.`,
      'zh-Hans': `最多连续探测多少个端口。默认：\`${DEFAULT_DISCOVERY_ATTEMPTS}\`。`
    }
  }
]

const cliExamples: CliExampleDefinition[] = [
  {
    title: {
      en: 'Run one standalone hub:',
      'zh-Hans': '启动一个 standalone hub：'
    },
    command: `modeldriveprotocol-server --port ${DEFAULT_MDP_PORT} --server-id hub`
  },
  {
    title: {
      en: 'Run one edge in auto mode:',
      'zh-Hans': '启动一个 auto 模式的 edge：'
    },
    command: 'modeldriveprotocol-server --cluster-mode auto --server-id edge-01'
  },
  {
    title: {
      en: 'Require one explicit upstream hub:',
      'zh-Hans': '要求存在一个显式上游 hub：'
    },
    command: `modeldriveprotocol-server --cluster-mode proxy-required --upstream-url ws://${DEFAULT_SERVER_HOST}:${DEFAULT_MDP_PORT}`
  }
]

export function renderHelpText(): string {
  const labels = optionDefinitions.map(formatHelpLabel)
  const width = Math.max(...labels.map((label) => label.length))
  const lines = [
    `Usage: ${usageLine}`,
    `       ${setupUsageLine}`,
    '',
    'Commands:',
    '  setup                                           Configure supported agent and IDE MCP hosts',
    '',
    'Options:',
    ...optionDefinitions.map((option, index) => {
      const label = labels[index] ?? formatHelpLabel(option)
      return `  ${label.padEnd(width)}  ${option.helpDescription}`
    }),
    '',
    'Examples:',
    ...cliExamples.flatMap((example) => [
      `  ${example.command}`
    ]),
    '  modeldriveprotocol-server setup --cursor'
  ]

  return lines.join('\n')
}

export function renderCliOptionsMarkdown(category: CliOptionCategory, locale: CliDocLocale): string {
  const header = locale === 'en'
    ? '| Option | Purpose |\n| --- | --- |'
    : '| 参数 | 作用 |\n| --- | --- |'

  const rows = optionDefinitions
    .filter((option) => option.category === category)
    .map((option) => `| \`${formatMarkdownLabel(option)}\` | ${option.markdownDescription[locale]} |`)

  return [header, ...rows].join('\n')
}

export function renderCliHelpMarkdown(): string {
  return ['```text', renderHelpText(), '```'].join('\n')
}

function formatHelpLabel(option: CliOptionDefinition): string {
  return option.valueName
    ? `${option.flags.join(', ')} ${option.valueName}`
    : option.flags.join(', ')
}

function formatMarkdownLabel(option: CliOptionDefinition): string {
  return option.valueName
    ? `${option.flags.join(', ')} ${option.valueName}`
    : option.flags.join(', ')
}
