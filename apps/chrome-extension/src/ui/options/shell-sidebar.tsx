import BrightnessAutoOutlined from '@mui/icons-material/BrightnessAutoOutlined'
import DarkModeOutlined from '@mui/icons-material/DarkModeOutlined'
import LightModeOutlined from '@mui/icons-material/LightModeOutlined'
import RouteOutlined from '@mui/icons-material/RouteOutlined'
import SettingsOutlined from '@mui/icons-material/SettingsOutlined'
import StorageOutlined from '@mui/icons-material/StorageOutlined'
import StorefrontOutlined from '@mui/icons-material/StorefrontOutlined'
import TranslateOutlined from '@mui/icons-material/TranslateOutlined'
import {
  Autocomplete,
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography
} from '@mui/material'

import type { AppearancePreference } from '../appearance.js'
import type { LocalePreference } from '../i18n.js'
import type { NavItem } from './types.js'
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

  return (
    <Box
      component="aside"
      sx={{ bgcolor: 'action.hover', height: '100vh', overflow: 'hidden' }}
    >
      <Box
        sx={{
          height: '100%',
          display: 'grid',
          gridTemplateRows: 'auto minmax(0, 1fr) auto'
        }}
      >
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          sx={{
            px: 1.5,
            py: 1.5,
            minHeight: 56,
            borderBottom: '1px solid',
            borderColor: 'divider'
          }}
        >
          <Box
            component="img"
            src={chrome.runtime.getURL('icons/icon-32.png')}
            alt="MDP"
            sx={{ width: 28, height: 28, display: 'block', flexShrink: 0 }}
          />
          <Typography variant="subtitle2" noWrap>
            {t('options.brand')}
          </Typography>
        </Stack>

        <Box sx={{ minHeight: 0, overflow: 'auto', px: 1.25 }}>
          <List dense disablePadding>
            {navItems.map((item) => (
              <ListItem key={item.id} disablePadding sx={{ mb: 0.25 }}>
                <ListItemButton
                  selected={controller.section === item.id}
                  onClick={() =>
                    controller.setSectionAndHash(item.id, {
                      clientDetailOpen: false
                    })
                  }
                  sx={{ minHeight: 40, px: 1 }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 32,
                      color:
                        controller.section === item.id
                          ? 'primary.main'
                          : 'text.secondary'
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>

        <Stack spacing={1} sx={{ p: 1.25 }}>
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
            <ListItem disablePadding>
              <ListItemButton
                selected={controller.section === 'settings'}
                onClick={() =>
                  controller.setSectionAndHash('settings', {
                    clientDetailOpen: false
                  })
                }
                sx={{ minHeight: 40, px: 1 }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 32,
                    color:
                      controller.section === 'settings'
                        ? 'primary.main'
                        : 'text.secondary'
                  }}
                >
                  <SettingsOutlined fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary={t('options.nav.settings')}
                  primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
                />
              </ListItemButton>
            </ListItem>
          </List>
        </Stack>
      </Box>
    </Box>
  )
}
