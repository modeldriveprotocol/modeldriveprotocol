import AddOutlined from '@mui/icons-material/AddOutlined'
import DeleteOutlineOutlined from '@mui/icons-material/DeleteOutlineOutlined'
import { Box, Divider, FormControlLabel, MenuItem, Stack, Switch, Tab, Tabs, TextField, Typography } from '@mui/material'
import { useEffect, useState } from 'react'

import { canCreateRouteClientFromUrl, matchesRouteClient, stringifyMatchPatterns, type ExtensionConfig, type RouteClientConfig } from '#~/shared/config.js'
import type { ClientInvocationStats } from '#~/background/shared.js'
import type { OptionsAssetsTab } from '../../../platform/extension-api.js'
import { useI18n } from '../../../i18n/provider.js'
import { IconPicker } from '../icon-picker.js'
import { ToolbarIcon } from '../shared.js'
import { formatSurfaceUrlLabel, type ClientDetailTab } from '../types.js'
import { ClientAssetsPanel } from './client-assets-panel.js'
import { ClientInvocationPanel } from './invocation-insights.js'

export function ClientEditor({
  client,
  currentPageUrl,
  draft,
  initialAssetTab,
  initialTab,
  invocationStats,
  matchingTabCount,
  onClearHistory,
  onChange
}: {
  client: RouteClientConfig
  currentPageUrl: string | undefined
  draft: ExtensionConfig
  initialAssetTab: OptionsAssetsTab | undefined
  initialTab: ClientDetailTab | undefined
  invocationStats: ClientInvocationStats | undefined
  matchingTabCount: number | undefined
  onClearHistory: () => void
  onChange: (config: ExtensionConfig) => void
}) {
  const { t } = useI18n()
  const [tab, setTab] = useState<ClientDetailTab>(initialTab ?? 'basics')
  const matched = Boolean(currentPageUrl && canCreateRouteClientFromUrl(currentPageUrl) && matchesRouteClient(currentPageUrl, client))
  const hasMatchingOpenTab = (matchingTabCount ?? 0) > 0
  const currentPageLabel = formatSurfaceUrlLabel(currentPageUrl)
  const runtimeLabel = matched
    ? currentPageLabel
    : hasMatchingOpenTab
      ? t('options.clients.openTabs', { count: matchingTabCount ?? 0 })
      : currentPageLabel
  const stretchBody = tab === 'assets'

  useEffect(() => {
    setTab(initialTab ?? 'basics')
  }, [client.id, initialTab])

  function updateClient(next: RouteClientConfig) {
    onChange({
      ...draft,
      routeClients: draft.routeClients.map((item) => (item.id === client.id ? next : item))
    })
  }

  return (
    <Stack spacing={1.25} sx={stretchBody ? { flex: 1, minHeight: 0 } : undefined}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={0.75}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        justifyContent="space-between"
        sx={{ pt: 1.25 }}
      >
        <Stack spacing={0.25} sx={{ minWidth: 0 }}>
          <Typography variant="body2" sx={{ color: matched || hasMatchingOpenTab ? 'success.main' : 'text.secondary', fontWeight: 600 }}>
            {matched ? t('options.clients.match') : hasMatchingOpenTab ? t('options.clients.active') : client.enabled ? t('options.clients.idle') : t('options.clients.off')}
          </Typography>
          {runtimeLabel ? <Typography variant="caption" color="text.secondary" noWrap>{runtimeLabel}</Typography> : null}
        </Stack>
        <Typography variant="caption" color="text.secondary">
          {[t('options.clients.flows', { count: client.recordings.length }), t('options.clients.resources', { count: client.selectorResources.length }), t('options.clients.skills', { count: client.skillEntries.length })].join(' · ')}
        </Typography>
      </Stack>

      <Box sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
        <Tabs value={tab} onChange={(_event, next) => setTab(next)} variant="scrollable" scrollButtons={false}>
          <Tab value="basics" label={t('options.clients.tab.basics')} />
          <Tab value="matching" label={t('options.clients.tab.matching')} />
          <Tab value="runtime" label={t('options.clients.tab.runtime')} />
          <Tab value="assets" label={t('options.clients.tab.assets')} />
          <Tab value="activity" label={t('options.clients.tab.activity')} />
        </Tabs>
      </Box>

      {tab === 'basics' ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1.25 }}>
          <FormControlLabel control={<Switch checked={client.enabled} onChange={(_, checked) => updateClient({ ...client, enabled: checked })} />} label={t('common.enabled')} />
          <TextField size="small" label={t('options.clients.type')} value={t('options.clients.type.route')} disabled />
          <IconPicker label={t('common.icon')} value={client.icon} onChange={(icon) => updateClient({ ...client, icon })} />
          <TextField size="small" label={t('common.clientName')} value={client.clientName} onChange={(event) => updateClient({ ...client, clientName: event.target.value })} />
          <TextField size="small" label={t('common.clientId')} value={client.clientId} onChange={(event) => updateClient({ ...client, clientId: event.target.value })} />
          <TextField size="small" label={t('common.description')} multiline minRows={3} value={client.clientDescription} onChange={(event) => updateClient({ ...client, clientDescription: event.target.value })} sx={{ gridColumn: '1 / -1' }} />
        </Box>
      ) : null}

      {tab === 'matching' ? (
        <Stack spacing={1.25}>
          <TextField size="small" label={t('options.clients.matchPatterns')} multiline minRows={3} helperText={t('options.clients.matchPatternsHelp')} value={stringifyMatchPatterns(client.matchPatterns)} onChange={(event) => updateClient({ ...client, matchPatterns: event.target.value.split(/\r?\n/g).map((value) => value.trim()).filter(Boolean) })} />
          <Divider />
          <Stack spacing={1}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography variant="subtitle2">{t('options.clients.pathRules')}</Typography>
              <ToolbarIcon label={t('options.clients.addRule')} onClick={() => updateClient({ ...client, routeRules: [...client.routeRules, { id: `rule-${Date.now()}`, mode: 'pathname-prefix', value: '/' }] })}>
                <AddOutlined fontSize="small" />
              </ToolbarIcon>
            </Stack>
            {client.routeRules.map((rule) => (
              <Box key={rule.id} sx={{ display: 'grid', gridTemplateColumns: '220px minmax(0, 1fr) auto', gap: 1, alignItems: 'center' }}>
                <TextField size="small" select value={rule.mode} onChange={(event) => updateClient({ ...client, routeRules: client.routeRules.map((item) => item.id === rule.id ? { ...item, mode: event.target.value as typeof item.mode } : item) })}>
                  <MenuItem value="pathname-prefix">{t('options.clients.rule.pathname-prefix')}</MenuItem>
                  <MenuItem value="pathname-exact">{t('options.clients.rule.pathname-exact')}</MenuItem>
                  <MenuItem value="url-contains">{t('options.clients.rule.url-contains')}</MenuItem>
                  <MenuItem value="regex">{t('options.clients.rule.regex')}</MenuItem>
                </TextField>
                <TextField size="small" value={rule.value} onChange={(event) => updateClient({ ...client, routeRules: client.routeRules.map((item) => item.id === rule.id ? { ...item, value: event.target.value } : item) })} />
                <ToolbarIcon label={t('options.clients.removeRule')} onClick={() => updateClient({ ...client, routeRules: client.routeRules.filter((item) => item.id !== rule.id) })}>
                  <DeleteOutlineOutlined fontSize="small" />
                </ToolbarIcon>
              </Box>
            ))}
          </Stack>
        </Stack>
      ) : null}

      {tab === 'runtime' ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 1.25 }}>
          <FormControlLabel control={<Switch checked={client.autoInjectBridge} onChange={(_, checked) => updateClient({ ...client, autoInjectBridge: checked })} />} label={t('options.clients.autoInjectBridge')} />
          <TextField size="small" label={t('options.clients.defaultToolScript')} multiline minRows={9} value={client.toolScriptSource} onChange={(event) => updateClient({ ...client, toolScriptSource: event.target.value })} />
        </Box>
      ) : null}

      {tab === 'assets' ? (
        <Box sx={{ flex: 1, minHeight: 0, display: 'flex' }}>
          <ClientAssetsPanel
            client={client}
            draft={draft}
            initialTab={initialAssetTab}
            onChange={onChange}
          />
        </Box>
      ) : null}
      {tab === 'activity' ? (
        <ClientInvocationPanel
          description={t('options.clients.invocations.description')}
          onClearHistory={onClearHistory}
          stats={invocationStats}
        />
      ) : null}
    </Stack>
  )
}
