import { Box } from '@mui/material'

import type { AppearancePreference } from '../appearance.js'
import type { LocalePreference } from '../i18n.js'
import type { ExtensionConfig } from '#~/shared/config.js'
import type { OptionsController } from './use-options-controller.js'
import { OptionsMainPanel } from './shell-main-panel.js'
import { OptionsSidebar } from './shell-sidebar.js'

type OptionsShellProps = {
  appearancePreference: AppearancePreference
  controller: OptionsController
  draft: ExtensionConfig
  localePreference: LocalePreference
  setAppearancePreference: (next: AppearancePreference) => Promise<void>
  setLocalePreference: (next: LocalePreference) => Promise<void>
  t: (key: string, values?: Record<string, string | number>) => string
}

export function OptionsShell(props: OptionsShellProps) {
  return (
    <Box
      sx={{
        height: '100vh',
        display: 'grid',
        gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: '220px minmax(0, 1fr)' },
        bgcolor: 'background.default',
        overflow: 'hidden'
      }}
    >
      <OptionsSidebar
        appearancePreference={props.appearancePreference}
        controller={props.controller}
        localePreference={props.localePreference}
        setAppearancePreference={props.setAppearancePreference}
        setLocalePreference={props.setLocalePreference}
        t={props.t}
      />
      <OptionsMainPanel {...props} />
    </Box>
  )
}
