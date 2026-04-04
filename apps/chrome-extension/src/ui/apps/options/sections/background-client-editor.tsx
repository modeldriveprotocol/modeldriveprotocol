import {
  Box,
  FormControlLabel,
  List,
  ListItem,
  ListItemText,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography
} from '@mui/material'
import { useEffect, useState } from 'react'

import {
  BACKGROUND_BROWSER_EXPOSE_DEFINITIONS,
  BACKGROUND_SKILL_EXPOSE_DEFINITIONS,
  BACKGROUND_WORKSPACE_EXPOSE_DEFINITIONS,
  countEnabledBackgroundExposes,
  isBackgroundExposeEnabled,
  isRequiredBackgroundClientId,
  type BackgroundClientConfig,
  type BackgroundExposeDefinition,
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

  function setExposeEnabled(path: string, enabled: boolean) {
    const disabledPaths = new Set(client.disabledExposePaths)

    if (enabled) {
      disabledPaths.delete(path)
    } else {
      disabledPaths.add(path)
    }

    updateClient({
      ...client,
      disabledExposePaths: [...disabledPaths]
    })
  }

  const enabledExposeCount = countEnabledBackgroundExposes(client, {
    kind: 'endpoint'
  })
  const enabledBrowserExposeCount = countEnabledBackgroundExposes(client, {
    group: 'browser'
  })
  const enabledWorkspaceExposeCount = countEnabledBackgroundExposes(client, {
    group: 'workspace'
  })
  const enabledSkillCount = countEnabledBackgroundExposes(client, {
    kind: 'skill'
  })
  const totalExposeCount =
    BACKGROUND_BROWSER_EXPOSE_DEFINITIONS.length +
    BACKGROUND_WORKSPACE_EXPOSE_DEFINITIONS.length
  const isRequiredClient = isRequiredBackgroundClientId(client.id)

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
          <Typography
            variant="body2"
            sx={{
              color:
                runtimeState === 'connected' ? 'success.main' : 'text.secondary',
              fontWeight: 600
            }}
          >
            {runtimeState
              ? t(`connection.${runtimeState}`)
              : client.enabled
                ? t('options.clients.idle')
                : t('options.clients.off')}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {t('options.clients.backgroundSummary')}
          </Typography>
        </Stack>
        <Typography variant="caption" color="text.secondary">
          {[
            t('options.clients.backgroundExposesCount', {
              enabled: enabledExposeCount,
              total: totalExposeCount
            }),
            t('options.clients.backgroundSkillsCount', {
              enabled: enabledSkillCount,
              total: BACKGROUND_SKILL_EXPOSE_DEFINITIONS.length
            })
          ].join(' · ')}
        </Typography>
      </Stack>

      <Box sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
        <Tabs
          value={tab}
          onChange={(_event, next) => setTab(next)}
          variant="scrollable"
          scrollButtons={false}
        >
          <Tab value="basics" label={t('options.clients.tab.basics')} />
          <Tab value="assets" label={t('options.clients.tab.assets')} />
          <Tab value="activity" label={t('options.clients.tab.activity')} />
        </Tabs>
      </Box>

      {tab === 'basics' ? (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: 1.25
          }}
        >
          <FormControlLabel
            control={
              <Switch
                checked={client.enabled}
                disabled={isRequiredClient}
                onChange={(_, checked) => updateClient({ ...client, enabled: checked })}
              />
            }
            label={t('common.enabled')}
          />
          <TextField
            size="small"
            label={t('options.clients.type')}
            value={t('options.clients.type.background')}
            disabled
          />
          <IconPicker
            label={t('common.icon')}
            value={client.icon}
            onChange={(icon) => updateClient({ ...client, icon })}
          />
          <TextField
            size="small"
            label={t('common.clientName')}
            value={client.clientName}
            onChange={(event) =>
              updateClient({ ...client, clientName: event.target.value })
            }
          />
          <TextField
            size="small"
            label={t('common.clientId')}
            value={client.clientId}
            disabled={isRequiredClient}
            onChange={(event) =>
              updateClient({ ...client, clientId: event.target.value })
            }
          />
          <TextField
            size="small"
            label={t('common.description')}
            value={client.clientDescription}
            onChange={(event) =>
              updateClient({ ...client, clientDescription: event.target.value })
            }
            multiline
            minRows={3}
            sx={{ gridColumn: '1 / -1' }}
          />
        </Box>
      ) : tab === 'assets' ? (
        <Stack spacing={1.25}>
          <Typography variant="body2" color="text.secondary">
            {t('options.clients.backgroundAssetsDescription')}
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', lg: 'repeat(3, minmax(0, 1fr))' },
              gap: 1.25
            }}
          >
            <BackgroundExposeList
              countLabel={t('options.clients.backgroundAssetsEnabledCount', {
                enabled: enabledBrowserExposeCount,
                total: BACKGROUND_BROWSER_EXPOSE_DEFINITIONS.length
              })}
              definitions={BACKGROUND_BROWSER_EXPOSE_DEFINITIONS}
              onToggle={isRequiredClient ? () => undefined : setExposeEnabled}
              title={t('options.clients.backgroundBrowserExposes')}
              toggles={client}
            />
            <BackgroundExposeList
              countLabel={t('options.clients.backgroundAssetsEnabledCount', {
                enabled: enabledWorkspaceExposeCount,
                total: BACKGROUND_WORKSPACE_EXPOSE_DEFINITIONS.length
              })}
              definitions={BACKGROUND_WORKSPACE_EXPOSE_DEFINITIONS}
              onToggle={isRequiredClient ? () => undefined : setExposeEnabled}
              title={t('options.clients.backgroundWorkspaceExposes')}
              toggles={client}
            />
            <BackgroundExposeList
              countLabel={t('options.clients.backgroundAssetsEnabledCount', {
                enabled: enabledSkillCount,
                total: BACKGROUND_SKILL_EXPOSE_DEFINITIONS.length
              })}
              definitions={BACKGROUND_SKILL_EXPOSE_DEFINITIONS}
              emptyLabel={t('options.clients.backgroundSkillsEmpty')}
              onToggle={isRequiredClient ? () => undefined : setExposeEnabled}
              title={t('options.clients.backgroundSkills')}
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
      )}
    </Stack>
  )
}

function BackgroundExposeList({
  definitions,
  emptyLabel,
  countLabel,
  onToggle,
  title,
  toggles
}: {
  definitions: BackgroundExposeDefinition[]
  emptyLabel?: string
  countLabel: string
  onToggle: (path: string, enabled: boolean) => void
  title: string
  toggles: BackgroundClientConfig
}) {
  return (
    <Stack spacing={0.75}>
      <Stack spacing={0.25}>
        <Typography variant="subtitle2">{title}</Typography>
        <Typography variant="caption" color="text.secondary">
          {countLabel}
        </Typography>
      </Stack>

      {definitions.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {emptyLabel}
        </Typography>
      ) : (
        <List dense disablePadding>
          {definitions.map((definition) => {
            const enabled = isBackgroundExposeEnabled(toggles, definition.path)

            return (
              <ListItem key={definition.path} disablePadding sx={{ py: 0.25 }}>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1fr) auto',
                    gap: 1,
                    alignItems: 'center',
                    width: '100%'
                  }}
                >
                  <ListItemText
                    primary={formatBackgroundExposeLabel(definition)}
                    secondary={definition.description}
                    primaryTypographyProps={{ variant: 'body2', fontFamily: 'monospace' }}
                    secondaryTypographyProps={{ variant: 'caption' }}
                  />
                  <Switch
                    checked={enabled}
                    edge="end"
                    inputProps={{ 'aria-label': definition.path }}
                    onChange={(_, checked) => onToggle(definition.path, checked)}
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

function formatBackgroundExposeLabel(definition: BackgroundExposeDefinition): string {
  return definition.kind === 'skill'
    ? definition.path
    : `${definition.method ?? 'GET'} ${definition.path}`
}
