import type { PopupClientState } from '#~/background/shared.js'

export function stateTone(state: PopupClientState['connectionState']): 'default' | 'success' | 'warning' | 'error' {
  switch (state) {
    case 'connected':
      return 'success'
    case 'connecting':
      return 'warning'
    case 'error':
      return 'error'
    default:
      return 'default'
  }
}

export function connectionStateColor(
  state: PopupClientState['connectionState']
): string {
  switch (state) {
    case 'connected':
      return 'success.main'
    case 'connecting':
      return 'warning.main'
    case 'error':
      return 'error.main'
    default:
      return 'text.disabled'
  }
}

export function abilitySummary(
  client: PopupClientState,
  t: (key: string, vars?: Record<string, string | number | undefined>) => string
): string[] {
  return [
    t('popup.ability.tools', { count: client.recordingCount }),
    t('popup.ability.resources', { count: client.selectorResourceCount }),
    t('popup.ability.skills', { count: client.skillCount })
  ]
}

export function connectionStateLabel(
  state: PopupClientState['connectionState'],
  t: (key: string) => string
): string {
  switch (state) {
    case 'connected':
      return t('connection.connected')
    case 'connecting':
      return t('connection.connecting')
    case 'error':
      return t('connection.error')
    default:
      return t('connection.disconnected')
  }
}

export function routeClientStatusLabel(args: {
  client: PopupClientState
  hasPermission: boolean
  hasBridge: boolean
  hasFlows: boolean
  isRecording: boolean
  isCapturingSelector: boolean
  t: (key: string) => string
}): string {
  if (args.isRecording) return args.t('popup.clientStatus.recording')
  if (args.isCapturingSelector) return args.t('popup.clientStatus.capturing')
  if (!args.hasPermission) return args.t('popup.clientStatus.needsPermission')
  if (!args.hasBridge) return args.t('popup.clientStatus.needsBridge')
  if (!args.hasFlows) return args.t('popup.clientStatus.readyToRecord')
  return args.t('popup.clientStatus.ready')
}

export function routeClientNextStepLabel(args: {
  hasPermission: boolean
  hasFlows: boolean
  hasResources: boolean
  hasSkills: boolean
  isRecording: boolean
  isCapturingSelector: boolean
  t: (key: string) => string
}): string {
  if (args.isRecording) return args.t('popup.nextStep.recording')
  if (args.isCapturingSelector) return args.t('popup.nextStep.capturing')
  if (!args.hasPermission) return args.t('popup.nextStep.permission')
  if (!args.hasFlows) return args.t('popup.nextStep.flow')
  if (!args.hasResources) return args.t('popup.nextStep.resource')
  if (!args.hasSkills) return args.t('popup.nextStep.skill')
  return args.t('popup.nextStep.review')
}

export function sidepanelFocusSummary(args: {
  clientName?: string
  hasClient: boolean
  canCreateFromActivePage: boolean
  hasPermission: boolean
  hasFlows: boolean
  hasResources: boolean
  hasSkills: boolean
  isRecording: boolean
  isCapturingSelector: boolean
  t: (key: string, vars?: Record<string, string | number | undefined>) => string
}): string {
  if (!args.hasClient) {
    return args.canCreateFromActivePage ? args.t('popup.focus.create') : args.t('popup.focus.unsupported')
  }
  if (!args.hasPermission) return args.t('popup.focus.permission', { name: args.clientName })
  if (args.isRecording) return args.t('popup.focus.recording', { name: args.clientName })
  if (args.isCapturingSelector) return args.t('popup.focus.capturing', { name: args.clientName })
  if (!args.hasFlows) return args.t('popup.focus.firstFlow', { name: args.clientName })
  if (!args.hasResources) return args.t('popup.focus.firstResource', { name: args.clientName })
  if (!args.hasSkills) return args.t('popup.focus.firstSkill', { name: args.clientName })
  return args.t('popup.focus.review', { name: args.clientName })
}

export function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export function resolveErrorRecoveryAction(args: {
  error?: string
  hasSelectedClient: boolean
  canCreateFromActivePage: boolean
}): 'grant' | 'create' | 'clients' | undefined {
  const message = args.error?.toLowerCase()
  if (!message) return undefined

  if (
    args.hasSelectedClient &&
    (message.includes('granted host permissions') || message.includes('grant host access') || message.includes('host access'))
  ) {
    return 'grant'
  }

  if (message.includes('does not match route client') || message.includes('no open tab currently matches route client')) {
    return args.canCreateFromActivePage ? 'create' : 'clients'
  }

  if (message.includes('no active tab is available')) {
    return 'clients'
  }

  return undefined
}

export type RouteClientPrimaryActionKind =
  | 'grant'
  | 'inject'
  | 'record'
  | 'stop'
  | 'capture'
  | 'skill'
  | 'assets'

export type SidepanelClientFilter = 'all' | 'background' | 'route'

export interface FlashState {
  message: string
  suggestSelectedClientPrimary?: boolean
}

export function getRouteClientPriority(args: {
  hasPermission: boolean
  hasBridge: boolean
  hasFlows: boolean
  hasResources: boolean
  hasSkills: boolean
  isRecording: boolean
  isCapturingSelector: boolean
}): number {
  if (args.isRecording) return 0
  if (args.isCapturingSelector) return 1
  if (!args.hasPermission) return 2
  if (!args.hasBridge) return 3
  if (!args.hasFlows) return 4
  if (!args.hasResources) return 5
  if (!args.hasSkills) return 6
  return 7
}
