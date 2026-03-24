export const clientIconEnum = [
  'chrome',
  'route',
  'robot',
  'code',
  'layers',
  'insights',
  'spark',
  'javascript',
  'html',
  'css'
] as const

export const routeRuleModeEnum = ['pathname-prefix', 'pathname-exact', 'url-contains', 'regex'] as const
export const marketSourceProviderEnum = ['github', 'gitlab'] as const
export const marketSourceRefTypeEnum = ['branch', 'tag', 'commit'] as const
export const recordedFlowStepTypeEnum = ['click', 'fill', 'pressKey'] as const
