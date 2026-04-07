import BrightnessAutoOutlined from '@mui/icons-material/BrightnessAutoOutlined'
import DarkModeOutlined from '@mui/icons-material/DarkModeOutlined'
import KeyboardDoubleArrowLeftOutlined from '@mui/icons-material/KeyboardDoubleArrowLeftOutlined'
import KeyboardDoubleArrowRightOutlined from '@mui/icons-material/KeyboardDoubleArrowRightOutlined'
import LightModeOutlined from '@mui/icons-material/LightModeOutlined'
import SettingsOutlined from '@mui/icons-material/SettingsOutlined'
import TranslateOutlined from '@mui/icons-material/TranslateOutlined'
import {
  Autocomplete,
  Box,
  IconButton,
  List,
  TextField,
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material'
import { type MouseEvent, type ReactNode, useState } from 'react'

import type { AppearancePreference } from '../../../foundation/appearance.js'
import type { LocalePreference } from '../../../i18n/provider.js'
import {
  OPTIONS_SIDEBAR_COLLAPSED_PADDING_X,
  OPTIONS_SIDEBAR_EXPANDED_PADDING_X,
  OPTIONS_SIDEBAR_VERTICAL_PADDING
} from '../layout.js'
import { SidebarNavItem } from './sidebar-nav-item.js'
import { SidebarSelectionPopover } from './selection-popover.js'

export function SidebarSettings({
  appearancePreference,
  collapsed,
  isSettingsSelected,
  localePreference,
  onNavigateSettings,
  onToggleCollapsed,
  setAppearancePreference,
  setLocalePreference,
  t
}: {
  appearancePreference: AppearancePreference
  collapsed: boolean
  isSettingsSelected: boolean
  localePreference: LocalePreference
  onNavigateSettings: () => void
  onToggleCollapsed: () => void
  setAppearancePreference: (next: AppearancePreference) => Promise<void>
  setLocalePreference: (next: LocalePreference) => Promise<void>
  t: (key: string, values?: Record<string, string | number>) => string
}) {
  const [localeAnchorEl, setLocaleAnchorEl] = useState<HTMLElement | null>(null)
  const [appearanceAnchorEl, setAppearanceAnchorEl] = useState<HTMLElement | null>(null)
  const appearanceIcon =
    appearancePreference === 'dark'
      ? <DarkModeOutlined fontSize="small" />
      : appearancePreference === 'light'
        ? <LightModeOutlined fontSize="small" />
        : <BrightnessAutoOutlined fontSize="small" />

  return (
    <>
      <Box
        sx={{
          px: collapsed
            ? OPTIONS_SIDEBAR_COLLAPSED_PADDING_X
            : OPTIONS_SIDEBAR_EXPANDED_PADDING_X,
          py: OPTIONS_SIDEBAR_VERTICAL_PADDING
        }}
      >
        {collapsed ? (
          <Box sx={{ display: 'grid', gap: 0.5, justifyItems: 'center' }}>
            <IconOnlySetting
              icon={<TranslateOutlined fontSize="small" />}
              label={t('options.sidebar.locale')}
              onClick={(event) => setLocaleAnchorEl(event.currentTarget)}
            />
            <IconOnlySetting
              icon={appearanceIcon}
              label={t('options.sidebar.appearance')}
              onClick={(event) => setAppearanceAnchorEl(event.currentTarget)}
            />
            <IconOnlySetting
              icon={<SettingsOutlined fontSize="small" />}
              label={t('options.nav.settings')}
              onClick={onNavigateSettings}
              selected={isSettingsSelected}
            />
          </Box>
        ) : (
          <Box sx={{ display: 'grid', gap: 1 }}>
            <Autocomplete
              size="small"
              options={['auto', 'zh-CN', 'en']}
              value={localePreference}
              onChange={(_event, nextValue) =>
                nextValue && void setLocalePreference(nextValue as LocalePreference)
              }
              getOptionLabel={(option) => t(`options.locale.${option}`)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  size="small"
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <>
                        <TranslateOutlined fontSize="small" />
                        <Box sx={{ width: 8, flexShrink: 0 }} />
                        {params.InputProps.startAdornment}
                      </>
                    )
                  }}
                />
              )}
            />
            <ToggleButtonGroup
              exclusive
              fullWidth
              size="small"
              value={appearancePreference}
              onChange={(_event, nextValue) =>
                nextValue && void setAppearancePreference(nextValue)
              }
            >
              <ToggleButton value="auto" aria-label={t('options.appearance.auto')}>
                <BrightnessAutoOutlined fontSize="small" />
              </ToggleButton>
              <ToggleButton value="light" aria-label={t('options.appearance.light')}>
                <LightModeOutlined fontSize="small" />
              </ToggleButton>
              <ToggleButton value="dark" aria-label={t('options.appearance.dark')}>
                <DarkModeOutlined fontSize="small" />
              </ToggleButton>
            </ToggleButtonGroup>
            <List dense disablePadding>
              <SidebarNavItem
                collapsed={false}
                icon={<SettingsOutlined fontSize="small" />}
                label={t('options.nav.settings')}
                onClick={onNavigateSettings}
                selected={isSettingsSelected}
              />
            </List>
          </Box>
        )}

        <List dense disablePadding sx={{ mt: 1 }}>
          <SidebarNavItem
            collapsed={collapsed}
            icon={
              collapsed
                ? <KeyboardDoubleArrowRightOutlined fontSize="small" />
                : <KeyboardDoubleArrowLeftOutlined fontSize="small" />
            }
            label={collapsed ? t('options.sidebar.expand') : t('options.sidebar.collapse')}
            onClick={onToggleCollapsed}
            selected={false}
          />
        </List>
      </Box>

      <SidebarSelectionPopover anchorEl={localeAnchorEl} onClose={() => setLocaleAnchorEl(null)}>
        <Autocomplete
          size="small"
          options={['auto', 'zh-CN', 'en']}
          value={localePreference}
          onChange={(_event, nextValue) => {
            if (!nextValue) {
              return
            }
            void setLocalePreference(nextValue as LocalePreference)
            setLocaleAnchorEl(null)
          }}
          getOptionLabel={(option) => t(`options.locale.${option}`)}
          renderInput={(params) => <TextField {...params} size="small" autoFocus />}
        />
      </SidebarSelectionPopover>

      <SidebarSelectionPopover anchorEl={appearanceAnchorEl} onClose={() => setAppearanceAnchorEl(null)}>
        <ToggleButtonGroup
          exclusive
          fullWidth
          size="small"
          value={appearancePreference}
          onChange={(_event, nextValue) => {
            if (!nextValue) {
              return
            }
            void setAppearancePreference(nextValue)
            setAppearanceAnchorEl(null)
          }}
        >
          <ToggleButton value="auto" aria-label={t('options.appearance.auto')}>
            <BrightnessAutoOutlined fontSize="small" />
          </ToggleButton>
          <ToggleButton value="light" aria-label={t('options.appearance.light')}>
            <LightModeOutlined fontSize="small" />
          </ToggleButton>
          <ToggleButton value="dark" aria-label={t('options.appearance.dark')}>
            <DarkModeOutlined fontSize="small" />
          </ToggleButton>
        </ToggleButtonGroup>
      </SidebarSelectionPopover>
    </>
  )
}

function IconOnlySetting({
  icon,
  label,
  onClick,
  selected = false
}: {
  icon: ReactNode
  label: string
  onClick: (event: MouseEvent<HTMLElement>) => void
  selected?: boolean
}) {
  return (
    <IconButton
      size="small"
      aria-label={label}
      onClick={onClick}
      sx={{
        width: 40,
        height: 40,
        borderRadius: 1,
        color: selected ? 'primary.main' : 'text.secondary',
        bgcolor: selected ? 'action.selected' : 'transparent'
      }}
    >
      {icon}
    </IconButton>
  )
}
