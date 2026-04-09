import {
  DEFAULT_CLUSTER_DISCOVERY_INTERVAL_MS,
  DEFAULT_CLUSTER_ELECTION_TIMEOUT_MAX_MS,
  DEFAULT_CLUSTER_ELECTION_TIMEOUT_MIN_MS,
  DEFAULT_CLUSTER_HEARTBEAT_INTERVAL_MS,
  DEFAULT_CLUSTER_LEASE_DURATION_MS,
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
    helpDescription:
      `Bind port (default: ${DEFAULT_MDP_PORT}; auto/proxy-required use 0 after upstream discovery when omitted)`,
    markdownDescription: {
      en:
        `Bind port. Default: \`${DEFAULT_MDP_PORT}\`. In auto and proxy-required mode, omitted \`--port\` falls back to \`0\` only after an upstream hub is discovered, so the edge can use an ephemeral free port.`,
      'zh-Hans':
        `绑定端口。默认：\`${DEFAULT_MDP_PORT}\`。在 auto 和 proxy-required 模式下，只有在发现上游 hub 之后，省略 \`--port\` 才会回退到 \`0\`，让 edge 自动拿一个空闲临时端口。`
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
    flags: ['--state-store'],
    category: 'core',
    helpDescription: 'Enable node-local filesystem state snapshots in ./.mdp/store',
    markdownDescription: {
      en:
        'Enable node-local filesystem snapshots for current clients, routes, and service status. Default directory: `./.mdp/store` from the startup working directory.',
      'zh-Hans':
        '启用节点本地文件系统快照，记录当前 clients、路由表和服务状态。默认目录是启动工作目录下的 `./.mdp/store`。'
    }
  },
  {
    flags: ['--state-store-dir'],
    valueName: '<path>',
    category: 'core',
    helpDescription: 'Enable node-local filesystem state snapshots in a custom directory',
    markdownDescription: {
      en:
        'Enable node-local filesystem snapshots and write them to the provided directory. Relative paths resolve from the startup working directory.',
      'zh-Hans': '启用节点本地文件系统快照，并写入指定目录。相对路径会从启动工作目录解析。'
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
    flags: ['--cluster-id'],
    valueName: '<id>',
    category: 'cluster',
    helpDescription: 'Logical cluster identity (default: derived from discovery host/start port)',
    markdownDescription: {
      en:
        'Logical cluster identity. Default: derived from `--discover-host` and `--discover-start-port`. Peers from a different cluster id are ignored.',
      'zh-Hans':
        '逻辑 cluster identity。默认根据 `--discover-host` 和 `--discover-start-port` 推导。不同 cluster id 的 peer 会被忽略。'
    }
  },
  {
    flags: ['--cluster-config'],
    valueName: '<path>',
    category: 'cluster',
    helpDescription: 'JSON cluster manifest that provides default cluster settings',
    markdownDescription: {
      en:
        'Optional JSON cluster manifest. It can provide defaults for `clusterId`, `clusterMembers`, discovery settings, and `upstreamUrl`. Explicit CLI flags still win.',
      'zh-Hans':
        '可选的 JSON cluster manifest。它可以为 `clusterId`、`clusterMembers`、discovery 参数和 `upstreamUrl` 提供默认值；显式 CLI 参数仍然优先生效。'
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
    flags: ['--cluster-members'],
    valueName: '<id,id,...>',
    category: 'cluster',
    helpDescription: 'Static cluster member ids used for quorum and peer admission',
    markdownDescription: {
      en:
        'Optional comma-separated server ids for a static cluster membership. Unknown peers are ignored for quorum and server-to-server control traffic.',
      'zh-Hans':
        '可选的逗号分隔 server id 列表，用来声明静态 cluster 成员集合。未知 peer 不会进入 quorum，也不会参与 server-to-server 控制面通信。'
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
  },
  {
    flags: ['--cluster-heartbeat-interval-ms'],
    valueName: '<ms>',
    category: 'cluster',
    helpDescription: `Leader heartbeat interval in milliseconds (default: ${DEFAULT_CLUSTER_HEARTBEAT_INTERVAL_MS})`,
    markdownDescription: {
      en: `Leader heartbeat interval in milliseconds. Default: \`${DEFAULT_CLUSTER_HEARTBEAT_INTERVAL_MS}\`.`,
      'zh-Hans': `主节点发送心跳的毫秒间隔。默认：\`${DEFAULT_CLUSTER_HEARTBEAT_INTERVAL_MS}\`。`
    }
  },
  {
    flags: ['--cluster-lease-duration-ms'],
    valueName: '<ms>',
    category: 'cluster',
    helpDescription: `Leader lease duration in milliseconds (default: ${DEFAULT_CLUSTER_LEASE_DURATION_MS})`,
    markdownDescription: {
      en:
        `Follower lease duration before triggering a new election. Default: \`${DEFAULT_CLUSTER_LEASE_DURATION_MS}\`.`,
      'zh-Hans': `从节点等待主节点续租的时长，超时后会触发新一轮选主。默认：\`${DEFAULT_CLUSTER_LEASE_DURATION_MS}\`。`
    }
  },
  {
    flags: ['--cluster-election-timeout-min-ms'],
    valueName: '<ms>',
    category: 'cluster',
    helpDescription: `Minimum randomized election timeout (default: ${DEFAULT_CLUSTER_ELECTION_TIMEOUT_MIN_MS})`,
    markdownDescription: {
      en:
        `Minimum randomized election timeout in milliseconds. Default: \`${DEFAULT_CLUSTER_ELECTION_TIMEOUT_MIN_MS}\`.`,
      'zh-Hans': `随机选主超时的最小毫秒值。默认：\`${DEFAULT_CLUSTER_ELECTION_TIMEOUT_MIN_MS}\`。`
    }
  },
  {
    flags: ['--cluster-election-timeout-max-ms'],
    valueName: '<ms>',
    category: 'cluster',
    helpDescription: `Maximum randomized election timeout (default: ${DEFAULT_CLUSTER_ELECTION_TIMEOUT_MAX_MS})`,
    markdownDescription: {
      en:
        `Maximum randomized election timeout in milliseconds. Default: \`${DEFAULT_CLUSTER_ELECTION_TIMEOUT_MAX_MS}\`.`,
      'zh-Hans': `随机选主超时的最大毫秒值。默认：\`${DEFAULT_CLUSTER_ELECTION_TIMEOUT_MAX_MS}\`。`
    }
  },
  {
    flags: ['--cluster-discovery-interval-ms'],
    valueName: '<ms>',
    category: 'cluster',
    helpDescription: `Peer rediscovery interval (default: ${DEFAULT_CLUSTER_DISCOVERY_INTERVAL_MS})`,
    markdownDescription: {
      en:
        `How often to refresh the discovered peer set in milliseconds. Default: \`${DEFAULT_CLUSTER_DISCOVERY_INTERVAL_MS}\`.`,
      'zh-Hans': `重新发现 cluster peer 的毫秒间隔。默认：\`${DEFAULT_CLUSTER_DISCOVERY_INTERVAL_MS}\`。`
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
    command:
      `modeldriveprotocol-server --cluster-mode proxy-required --upstream-url ws://${DEFAULT_SERVER_HOST}:${DEFAULT_MDP_PORT}`
  },
  {
    title: {
      en: 'Run one fixed three-node cluster:',
      'zh-Hans': '启动一个固定三节点 cluster：'
    },
    command: 'modeldriveprotocol-server --cluster-mode auto --server-id node-a --cluster-members node-a,node-b,node-c'
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
