import { Box, FormControlLabel, List, ListItem, ListItemText, Stack, Switch, Tab, Tabs, TextField, Typography } from '@mui/material'
import { useEffect, useState } from 'react'

import {
  BACKGROUND_RESOURCE_DEFINITIONS,
  BACKGROUND_SKILL_DEFINITIONS,
  BACKGROUND_TOOL_DEFINITIONS,
  countEnabledBackgroundCapabilities,
  isBackgroundCapabilityEnabled,
  type BackgroundCapabilityDefinition,
  type BackgroundCapabilityKind,
  type BackgroundClientConfig,
  type ExtensionConfig
} from '#~/shared/config.js'
import type { PopupState } from '#~/background/shared.js'
import { useI18n } from '../../../i18n/provider.js'
import { IconPicker } from '../icon-picker.js'
import type { ClientDetailTab } from '../types.js'
import { ClientInvocationPanel } from './invocation-insights.js'

export function BackgroundClientEditor({
  client,
  draft,
  initialTab,
  invocationStats,
  onClearHistory,
  runtimeState,
  onChange
}: {
  client: BackgroundClientConfig
  draft: ExtensionConfig
  initialTab: ClientDetailTab | undefined
  invocationStats: PopupState['clients'][number]['invocationStats'] | undefined
  onClearHistory: () => void
  runtimeState: PopupState['clients'][number]['connectionState'] | undefined
  onChange: (config: ExtensionConfig) => void
}) {
  const { t } = useI18n()
  const [tab, setTab] = useState<'basics' | 'assets' | 'activity'>(
    initialTab === 'activity' ? 'activity' : initialTab === 'assets' ? 'assets' : 'basics'
  )

  useEffect(() => {
    setTab(initialTab === 'activity' ? 'activity' : initialTab === 'assets' ? 'assets' : 'basics')
  }, [initialTab])

  function updateClient(next: BackgroundClientConfig) {
    onChange({
      ...draft,
      backgroundClients: draft.backgroundClients.map((item) =>
        item.id === next.id ? next : item
      )
    })
  }

  function setCapabilityEnabled(kind: BackgroundCapabilityKind, id: string, enabled: boolean) {
    const key =
      kind === 'tool'
        ? 'disabledTools'
        : kind === 'resource'
          ? 'disabledResources'
          : 'disabledSkills'
    const disabled = new Set(client[key])

    if (enabled) {
      disabled.delete(id)
    } else {
      disabled.add(id)
    }

    updateClient({
      ...client,
      [key]: [...disabled]
    })
  }

  const enabledToolCount = countEnabledBackgroundCapabilities(client, 'tool')
  const enabledResourceCount = countEnabledBackgroundCapabilities(client, 'resource')
  const enabledSkillCount = countEnabledBackgroundCapabilities(client, 'skill')

  return (
    <Stack spacing={1.25}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={0.75}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        justifyContent="space-between"
        sx={{ pt: 1.25 }}
      >
        <Stack spacing={0.25} sx={{ minWidth: 0 }}>
          <Typography variant="body2" sx={{ color: runtimeState === 'connected' ? 'success.main' : 'text.secondary', fontWeight: 600 }}>
            {runtimeState ? t(`connection.${runtimeState}`) : client.enabled ? t('options.clients.idle') : t('options.clients.off')}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>{t('options.clients.backgroundSummary')}</Typography>
        </Stack>
        <Typography variant="caption" color="text.secondary">
          {[
            t('options.clients.backgroundToolsCount', {
              enabled: enabledToolCount,
              total: BACKGROUND_TOOL_DEFINITIONS.length
            }),
            t('options.clients.backgroundResourcesCount', {
              enabled: enabledResourceCount,
              total: BACKGROUND_RESOURCE_DEFINITIONS.length
            }),
            t('options.clients.backgroundSkillsCount', {
              enabled: enabledSkillCount,
              total: BACKGROUND_SKILL_DEFINITIONS.length
            })
          ].join(' · ')}
        </Typography>
      </Stack>

      <Box sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
        <Tabs value={tab} onChange={(_event, next) => setTab(next)} variant="scrollable" scrollButtons={false}>
          <Tab value="basics" label={t('options.clients.tab.basics')} />
          <Tab value="assets" label={t('options.clients.tab.assets')} />
          <Tab value="activity" label={t('options.clients.tab.activity')} />
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
        tab === 'assets' ? (
          <Stack spacing={1.25}>
            <Typography variant="body2" color="text.secondary">{t('options.clients.backgroundAssetsDescription')}</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'repeat(3, minmax(0, 1fr))' }, gap: 1.25 }}>
              <BackgroundCapabilityList
                countLabel={t('options.clients.backgroundAssetsEnabledCount', {
                  enabled: enabledToolCount,
                  total: BACKGROUND_TOOL_DEFINITIONS.length
                })}
                definitions={BACKGROUND_TOOL_DEFINITIONS}
                kind="tool"
                onToggle={setCapabilityEnabled}
                title={t('options.clients.backgroundTools')}
                statusLabel={t}
                toggles={client}
              />
              <BackgroundCapabilityList
                countLabel={t('options.clients.backgroundAssetsEnabledCount', {
                  enabled: enabledResourceCount,
                  total: BACKGROUND_RESOURCE_DEFINITIONS.length
                })}
                definitions={BACKGROUND_RESOURCE_DEFINITIONS}
                kind="resource"
                onToggle={setCapabilityEnabled}
                title={t('options.clients.backgroundResources')}
                statusLabel={t}
                toggles={client}
              />
              <BackgroundCapabilityList
                countLabel={t('options.clients.backgroundAssetsEnabledCount', {
                  enabled: enabledSkillCount,
                  total: BACKGROUND_SKILL_DEFINITIONS.length
                })}
                definitions={BACKGROUND_SKILL_DEFINITIONS}
                emptyLabel={t('options.clients.backgroundSkillsEmpty')}
                kind="skill"
                onToggle={setCapabilityEnabled}
                title={t('options.clients.backgroundSkills')}
                statusLabel={t}
                toggles={client}
              />
            </Box>
          </Stack>
        ) : (
          <ClientInvocationPanel
            description={t('options.clients.invocations.description')}
            onClearHistory={onClearHistory}
            stats={invocationStats}
          />
        )
      )}
    </Stack>
  )
}

function BackgroundCapabilityList({
  definitions,
  emptyLabel,
  countLabel,
  kind,
  onToggle,
  title,
  statusLabel,
  toggles
}: {
  definitions: BackgroundCapabilityDefinition[]
  emptyLabel?: string
  countLabel: string
  kind: BackgroundCapabilityKind
  onToggle: (kind: BackgroundCapabilityKind, id: string, enabled: boolean) => void
  title: string
  statusLabel: (key: string) => string
  toggles: BackgroundClientConfig
}) {
  return (
    <Stack spacing={0.75}>
      <Stack spacing={0.25}>
        <Typography variant="subtitle2">{title}</Typography>
        <Typography variant="caption" color="text.secondary">{countLabel}</Typography>
      </Stack>

      {definitions.length === 0 ? (
        <Typography variant="body2" color="text.secondary">{emptyLabel}</Typography>
      ) : (
        <List dense disablePadding>
          {definitions.map((definition) => {
            const enabled = isBackgroundCapabilityEnabled(toggles, kind, definition.id)

            return (
              <ListItem key={definition.id} disablePadding sx={{ py: 0.25 }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 1, alignItems: 'center', width: '100%' }}>
                  <ListItemText
                    primary={definition.id}
                    secondary={enabled ? statusLabel('options.clients.backgroundAssetStatus.enabled') : statusLabel('options.clients.backgroundAssetStatus.disabled')}
                    primaryTypographyProps={{ variant: 'body2', fontFamily: 'monospace' }}
                    secondaryTypographyProps={{ variant: 'caption' }}
                  />
                  <Switch
                    checked={enabled}
                    edge="end"
                    inputProps={{ 'aria-label': definition.id }}
                    onChange={(_, checked) => onToggle(kind, definition.id, checked)}
                  />
                </Box>
              </ListItem>
            )
          })}
        </List>
      )}
    </Stack>
  )
}
