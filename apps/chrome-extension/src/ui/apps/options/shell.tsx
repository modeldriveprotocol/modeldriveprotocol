import { Box } from '@mui/material'

import type { AppearancePreference } from '../../foundation/appearance.js'
import type { LocalePreference } from '../../i18n/provider.js'
import type { ExtensionConfig } from '#~/shared/config.js'
import {
  OPTIONS_SIDEBAR_COLLAPSED_WIDTH,
  OPTIONS_SIDEBAR_EXPANDED_WIDTH,
  OPTIONS_SIDEBAR_TRANSITION
} from './layout.js'
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
        gridTemplateColumns: `${props.controller.sidebarCollapsed ? OPTIONS_SIDEBAR_COLLAPSED_WIDTH : OPTIONS_SIDEBAR_EXPANDED_WIDTH}px minmax(0, 1fr)`,
        bgcolor: 'background.default',
        overflow: 'hidden',
        transition: `grid-template-columns ${OPTIONS_SIDEBAR_TRANSITION}`
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
