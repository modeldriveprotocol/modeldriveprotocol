import { CssBaseline } from '@mui/material'
import { createRoot } from 'react-dom/client'

import { AppearanceProvider, ExtensionThemeProvider } from '../../src/ui/foundation/appearance.js'
import { I18nProvider } from '../../src/ui/i18n/provider.js'
import { OptionsApp } from '../../src/ui/apps/options/app.js'
import '../../src/ui/foundation/global.css'

const rootElement = document.querySelector<HTMLElement>('#options-app')

if (!rootElement) {
  throw new Error('Options root element not found')
}

createRoot(rootElement).render(
  <AppearanceProvider>
    <ExtensionThemeProvider>
      <I18nProvider>
        <CssBaseline />
        <OptionsApp />
      </I18nProvider>
    </ExtensionThemeProvider>
  </AppearanceProvider>
)
