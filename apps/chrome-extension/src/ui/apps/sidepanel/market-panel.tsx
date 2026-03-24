import RefreshOutlined from '@mui/icons-material/RefreshOutlined'
import SettingsOutlined from '@mui/icons-material/SettingsOutlined'
import { Alert, Box, Button, Stack, Typography } from '@mui/material'

import { renderClientIcon } from '../../foundation/client-icons.js'
import { openOptionsSection } from '../../platform/extension-api.js'
import { ActionIcon } from './action-icon.js'
import type { SidepanelController } from './types.js'

export function MarketPanel({ controller }: { controller: SidepanelController }) {
  const failedCatalogCount = controller.marketCatalogs.filter((catalog) => catalog.error).length

  return (
    <Stack spacing={1}>
      <Stack direction="row" spacing={1} alignItems="center">
        <ActionIcon label={controller.t('popup.market.refresh')} onClick={controller.refreshMarketCatalogs}>
          <RefreshOutlined fontSize="small" />
        </ActionIcon>
        <ActionIcon label={controller.t('popup.market.manageSources')} onClick={() => void openOptionsSection('market')}>
          <SettingsOutlined fontSize="small" />
        </ActionIcon>
      </Stack>

      {controller.marketLoadError ? <Alert severity="error">{controller.marketLoadError}</Alert> : null}
      {failedCatalogCount > 0 ? (
        <Alert severity="warning">
          {controller.t('popup.market.partialError', { count: failedCatalogCount })}
        </Alert>
      ) : null}

      {controller.marketLoading ? (
        <Typography variant="body2" color="text.secondary">
          {controller.t('popup.market.loading')}
        </Typography>
      ) : controller.state?.config.marketSources.length === 0 ? (
        <EmptyState
          title={controller.t('popup.market.emptySources')}
          description={controller.t('popup.market.emptySourcesHint')}
          actionLabel={controller.t('popup.market.manageSources')}
          onAction={() => void openOptionsSection('market')}
        />
      ) : controller.marketEntries.length === 0 ? (
        <EmptyState
          title={controller.t('popup.market.emptyMatches')}
          description={controller.t('popup.market.emptyMatchesHint')}
          actionLabel={controller.t('popup.market.manageSources')}
          onAction={() => void openOptionsSection('market')}
        />
      ) : (
        <Stack spacing={1}>
          {controller.marketEntries.map((item) => (
            <Box key={item.key} sx={cardSx}>
              <Stack spacing={1.25}>
                <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                    <Box sx={iconBoxSx}>{renderClientIcon(item.entry.icon)}</Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="subtitle2" noWrap>
                        {item.entry.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" noWrap>
                        {item.catalog.title}
                      </Typography>
                    </Box>
                  </Stack>
                  <Button
                    size="small"
                    variant={item.localCount > 0 ? 'outlined' : 'contained'}
                    onClick={() =>
                      void controller.runAction(
                        controller.t('popup.market.installed'),
                        async () => controller.installMarketClient(item.catalog, item.entry),
                        { suggestSelectedClientPrimary: true }
                      )
                    }
                  >
                    {item.localCount > 0
                      ? controller.t('popup.market.installAgain')
                      : controller.t('popup.market.install')}
                  </Button>
                </Stack>

                <Typography variant="body2" color="text.secondary">
                  {item.entry.summary ||
                    item.entry.template.clientDescription ||
                    controller.t('popup.market.noSummary')}
                </Typography>

                <Typography variant="caption" color="text.secondary">
                  {controller.t('popup.market.localClients', { count: item.localCount })}
                </Typography>
              </Stack>
            </Box>
          ))}
        </Stack>
      )}
    </Stack>
  )
}

function EmptyState({
  title,
  description,
  actionLabel,
  onAction
}: {
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
}) {
  return (
    <Stack spacing={0.75} sx={{ py: 1 }}>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {description}
      </Typography>
      {actionLabel && onAction ? (
        <Button size="small" variant="text" onClick={onAction} sx={{ alignSelf: 'flex-start', px: 0 }}>
          {actionLabel}
        </Button>
      ) : null}
    </Stack>
  )
}

const cardSx = {
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: '14px',
  bgcolor: 'background.paper',
  p: 1.5
}

const iconBoxSx = {
  width: 34,
  height: 34,
  borderRadius: '10px',
  border: '1px solid',
  borderColor: 'divider',
  bgcolor: 'background.paper',
  color: 'text.primary',
  display: 'grid',
  placeItems: 'center',
  flexShrink: 0
}
