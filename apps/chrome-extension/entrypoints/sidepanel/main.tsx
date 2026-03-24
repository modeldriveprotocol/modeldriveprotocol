import { CssBaseline } from '@mui/material'
import { createRoot } from 'react-dom/client'

import { AppearanceProvider, ExtensionThemeProvider } from '../../src/ui/appearance.js'
import { SidePanelApp } from '../../src/ui/sidepanel-app.js'
import { I18nProvider } from '../../src/ui/i18n.js'
import '../../src/ui/global.css'

const rootElement = document.querySelector<HTMLElement>('#sidepanel-app')

if (!rootElement) {
  throw new Error('Side panel root element not found')
}

createRoot(rootElement).render(
  <AppearanceProvider>
    <ExtensionThemeProvider>
      <I18nProvider>
        <CssBaseline />
        <SidePanelApp />
      </I18nProvider>
    </ExtensionThemeProvider>
  </AppearanceProvider>
)
