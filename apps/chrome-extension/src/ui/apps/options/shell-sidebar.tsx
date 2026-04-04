import RouteOutlined from '@mui/icons-material/RouteOutlined'
import StorageOutlined from '@mui/icons-material/StorageOutlined'
import StorefrontOutlined from '@mui/icons-material/StorefrontOutlined'
import { Box, List } from '@mui/material'

import type { AppearancePreference } from '../../foundation/appearance.js'
import type { LocalePreference } from '../../i18n/provider.js'
import {
  OPTIONS_SIDEBAR_COLLAPSED_PADDING_X,
  OPTIONS_SIDEBAR_EXPANDED_PADDING_X,
  OPTIONS_SIDEBAR_SECTION_PADDING_Y,
  OPTIONS_SIDEBAR_TRANSITION
} from './layout.js'
import { SidebarBrand } from './shell-sidebar/sidebar-brand.js'
import { SidebarNavItem } from './shell-sidebar/sidebar-nav-item.js'
import { SidebarSettings } from './shell-sidebar/sidebar-settings.js'
import type { NavItem, Section } from './types.js'
import type { OptionsController } from './use-options-controller.js'

type OptionsSidebarProps = {
  appearancePreference: AppearancePreference
  controller: OptionsController
  localePreference: LocalePreference
  setAppearancePreference: (next: AppearancePreference) => Promise<void>
  setLocalePreference: (next: LocalePreference) => Promise<void>
  t: (key: string, values?: Record<string, string | number>) => string
}

export function OptionsSidebar({
  appearancePreference,
  controller,
  localePreference,
  setAppearancePreference,
  setLocalePreference,
  t
}: OptionsSidebarProps) {
  const sidebarCollapsed = controller.sidebarCollapsed
  const navItems: NavItem[] = [
    {
      id: 'workspace',
      label: t('options.nav.workspace'),
      icon: <StorageOutlined fontSize="small" />
    },
    {
      id: 'clients',
      label: t('options.nav.clients'),
      icon: <RouteOutlined fontSize="small" />
    },
    {
      id: 'market',
      label: t('options.nav.market'),
      icon: <StorefrontOutlined fontSize="small" />
    }
  ]

  function navigateToSection(section: Section) {
    controller.setSectionAndHash(section, {
      clientDetailOpen: false
    })
  }

  return (
    <Box
      component="aside"
      sx={{
        bgcolor: 'action.hover',
        height: '100vh',
        overflow: 'hidden',
        borderRight: '1px solid',
        borderColor: 'divider',
        transition: `padding ${OPTIONS_SIDEBAR_TRANSITION}, background-color ${OPTIONS_SIDEBAR_TRANSITION}`
      }}
    >
      <Box
        sx={{
          height: '100%',
          display: 'grid',
          gridTemplateRows: 'auto minmax(0, 1fr) auto'
        }}
      >
        <SidebarBrand collapsed={sidebarCollapsed} title={t('options.brand')} />

        <Box
          sx={{
            minHeight: 0,
            overflow: 'auto',
            px: sidebarCollapsed
              ? OPTIONS_SIDEBAR_COLLAPSED_PADDING_X
              : OPTIONS_SIDEBAR_EXPANDED_PADDING_X,
            py: OPTIONS_SIDEBAR_SECTION_PADDING_Y
          }}
        >
          <List dense disablePadding>
            {navItems.map((item) => (
              <SidebarNavItem
                key={item.id}
                collapsed={sidebarCollapsed}
                icon={item.icon}
                label={item.label}
                onClick={() => navigateToSection(item.id)}
                selected={controller.section === item.id}
              />
            ))}
          </List>
        </Box>

        <SidebarSettings
          appearancePreference={appearancePreference}
          collapsed={sidebarCollapsed}
          isSettingsSelected={controller.section === 'settings'}
          localePreference={localePreference}
          onNavigateSettings={() => navigateToSection('settings')}
          onToggleCollapsed={() =>
            controller.setSidebarCollapsedAndQuery(!sidebarCollapsed)
          }
          setAppearancePreference={setAppearancePreference}
          setLocalePreference={setLocalePreference}
          t={t}
        />
      </Box>
    </Box>
  )
}
