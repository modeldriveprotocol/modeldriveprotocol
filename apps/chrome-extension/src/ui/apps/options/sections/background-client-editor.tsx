import { Box, FormControlLabel, List, ListItem, ListItemText, Stack, Switch, Tab, Tabs, TextField, Typography } from '@mui/material'
import { useState } from 'react'

import type { BackgroundClientConfig, ExtensionConfig } from '#~/shared/config.js'
import type { PopupState } from '#~/background/shared.js'
import { useI18n } from '../../../i18n/provider.js'
import { IconPicker } from '../icon-picker.js'
import { BACKGROUND_BUILT_IN_RESOURCES, BACKGROUND_BUILT_IN_TOOLS } from '../types.js'

export function BackgroundClientEditor({
  client,
  draft,
  runtimeState,
  onChange
}: {
  client: BackgroundClientConfig
  draft: ExtensionConfig
  runtimeState: PopupState['clients'][number]['connectionState'] | undefined
  onChange: (config: ExtensionConfig) => void
}) {
  const { t } = useI18n()
  const [tab, setTab] = useState<'basics' | 'assets'>('basics')

  function updateClient(next: BackgroundClientConfig) {
    onChange({ ...draft, backgroundClient: next })
  }

  return (
    <Stack spacing={1.25}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={0.75} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between">
        <Stack spacing={0.25} sx={{ minWidth: 0 }}>
          <Typography variant="body2" sx={{ color: runtimeState === 'connected' ? 'success.main' : 'text.secondary', fontWeight: 600 }}>
            {runtimeState ? t(`connection.${runtimeState}`) : client.enabled ? t('options.clients.idle') : t('options.clients.off')}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>{t('options.clients.backgroundSummary')}</Typography>
        </Stack>
        <Typography variant="caption" color="text.secondary">
          {[t('popup.ability.tools', { count: BACKGROUND_BUILT_IN_TOOLS.length }), t('popup.ability.resources', { count: BACKGROUND_BUILT_IN_RESOURCES.length }), t('popup.ability.skills', { count: 0 })].join(' · ')}
        </Typography>
      </Stack>
      <Box sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
        <Tabs value={tab} onChange={(_event, next) => setTab(next)} variant="scrollable" scrollButtons={false}>
          <Tab value="basics" label={t('options.clients.tab.basics')} />
          <Tab value="assets" label={t('options.clients.tab.assets')} />
        </Tabs>
      </Box>

      {tab === 'basics' ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1.25 }}>
          <FormControlLabel control={<Switch checked={client.enabled} onChange={(_, checked) => updateClient({ ...client, enabled: checked })} />} label={t('common.enabled')} />
          <TextField size="small" label={t('options.clients.type')} value={t('options.clients.type.background')} disabled />
          <IconPicker label={t('common.icon')} value={client.icon} onChange={(icon) => updateClient({ ...client, icon })} />
          <TextField size="small" label={t('common.clientName')} value={client.clientName} onChange={(event) => updateClient({ ...client, clientName: event.target.value })} />
          <TextField size="small" label={t('common.clientId')} value={client.clientId} onChange={(event) => updateClient({ ...client, clientId: event.target.value })} />
          <TextField size="small" label={t('common.description')} value={client.clientDescription} onChange={(event) => updateClient({ ...client, clientDescription: event.target.value })} multiline minRows={3} sx={{ gridColumn: '1 / -1' }} />
        </Box>
      ) : (
        <Stack spacing={1.25}>
          <Typography variant="body2" color="text.secondary">{t('options.clients.backgroundAssetsDescription')}</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) minmax(0, 1fr)' }, gap: 1.25 }}>
            <Stack spacing={1}>
              <Typography variant="subtitle2">{t('options.clients.backgroundTools')}</Typography>
              <List dense disablePadding>
                {BACKGROUND_BUILT_IN_TOOLS.map((toolName) => (
                  <ListItem key={toolName} disablePadding sx={{ py: 0.25 }}>
                    <ListItemText primary={toolName} primaryTypographyProps={{ variant: 'body2', fontFamily: 'monospace' }} />
                  </ListItem>
                ))}
              </List>
            </Stack>
            <Stack spacing={1}>
              <Typography variant="subtitle2">{t('options.clients.backgroundResources')}</Typography>
              <List dense disablePadding>
                {BACKGROUND_BUILT_IN_RESOURCES.map((resourceUri) => (
                  <ListItem key={resourceUri} disablePadding sx={{ py: 0.25 }}>
                    <ListItemText primary={resourceUri} primaryTypographyProps={{ variant: 'body2', fontFamily: 'monospace' }} />
                  </ListItem>
                ))}
              </List>
            </Stack>
          </Box>
        </Stack>
      )}
    </Stack>
  )
}
