import BrowserUpdatedOutlined from '@mui/icons-material/BrowserUpdatedOutlined'
import CodeOutlined from '@mui/icons-material/CodeOutlined'
import CssOutlined from '@mui/icons-material/CssOutlined'
import HtmlOutlined from '@mui/icons-material/HtmlOutlined'
import HubOutlined from '@mui/icons-material/HubOutlined'
import InsightsOutlined from '@mui/icons-material/InsightsOutlined'
import JavascriptOutlined from '@mui/icons-material/JavascriptOutlined'
import LayersOutlined from '@mui/icons-material/LayersOutlined'
import SmartToyOutlined from '@mui/icons-material/SmartToyOutlined'
import AutoAwesomeOutlined from '@mui/icons-material/AutoAwesomeOutlined'
import type { ReactElement } from 'react'

import type { ClientIconKey } from '#~/shared/config.js'

export function getClientIconLabel(icon: ClientIconKey): string {
  switch (icon) {
    case 'chrome':
      return 'Chrome'
    case 'route':
      return 'Route'
    case 'robot':
      return 'Robot'
    case 'code':
      return 'Code'
    case 'layers':
      return 'Layers'
    case 'insights':
      return 'Insights'
    case 'spark':
      return 'Spark'
    case 'javascript':
      return 'JavaScript'
    case 'html':
      return 'HTML'
    case 'css':
      return 'CSS'
    default:
      return icon
  }
}

export function renderClientIcon(icon: ClientIconKey): ReactElement {
  switch (icon) {
    case 'chrome':
      return <BrowserUpdatedOutlined fontSize="small" />
    case 'robot':
      return <SmartToyOutlined fontSize="small" />
    case 'code':
      return <CodeOutlined fontSize="small" />
    case 'layers':
      return <LayersOutlined fontSize="small" />
    case 'insights':
      return <InsightsOutlined fontSize="small" />
    case 'spark':
      return <AutoAwesomeOutlined fontSize="small" />
    case 'javascript':
      return <JavascriptOutlined fontSize="small" />
    case 'html':
      return <HtmlOutlined fontSize="small" />
    case 'css':
      return <CssOutlined fontSize="small" />
    default:
      return <HubOutlined fontSize="small" />
  }
}
