import DownloadOutlined from '@mui/icons-material/DownloadOutlined'
import Inventory2Outlined from '@mui/icons-material/Inventory2Outlined'
import SourceOutlined from '@mui/icons-material/SourceOutlined'
import TagOutlined from '@mui/icons-material/TagOutlined'
import {
  Box,
  Button,
  Stack,
  Typography
} from '@mui/material'

import { renderClientIcon } from '../../../../foundation/client-icons.js'
import { OverviewStat } from '../../shared.js'
import type { MarketEntryItem } from './types.js'

export function MarketDetailView({
  item,
  onInstall,
  t
}: {
  item: MarketEntryItem | undefined
  onInstall: () => void
  t: (key: string, values?: Record<string, string | number>) => string
}) {
  if (!item) {
    return (
      <Typography variant="body2" color="text.secondary">
        {t('options.market.noSelection')}
      </Typography>
    )
  }

  const matchingCount = item.entry.template.matchPatterns.length
  const routeRuleCount = item.entry.template.routeRules.length

  return (
    <Stack spacing={1.25} sx={{ pt: 1.5 }}>
      <Stack direction="row" justifyContent="flex-end">
        <Button
          variant="contained"
          startIcon={<DownloadOutlined fontSize="small" />}
          onClick={onInstall}
        >
          {item.localCount > 0
            ? t('options.market.installAgain')
            : t('options.market.install')}
        </Button>
      </Stack>

      <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ minWidth: 0 }}>
        <Box sx={{ color: 'primary.main', display: 'grid', placeItems: 'center', pt: 0.25 }}>
          {renderClientIcon(item.entry.icon)}
        </Box>
        <Stack spacing={0.25} sx={{ minWidth: 0 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }} noWrap>
            {item.entry.title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {item.entry.summary || t('options.market.noSummary')}
          </Typography>
        </Stack>
      </Stack>

      <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
        <OverviewStat
          icon={<SourceOutlined fontSize="small" />}
          label={item.catalog.title}
        />
        <OverviewStat
          icon={<Inventory2Outlined fontSize="small" />}
          label={t('options.market.relatedLocalClients', { count: item.localCount })}
        />
        <OverviewStat
          icon={<TagOutlined fontSize="small" />}
          label={`${t('options.market.version')}: ${item.catalog.version}`}
        />
      </Stack>

      <Stack spacing={0.5}>
        <Typography variant="caption" color="text.secondary">
          {t('options.market.previewClient')}
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {item.entry.template.clientName}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {item.entry.template.clientDescription || t('options.market.noSummary')}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {[
            `${t('options.market.matching')}: ${matchingCount}`,
            t('options.market.pathRules', { count: routeRuleCount })
          ].join(' · ')}
        </Typography>
      </Stack>
    </Stack>
  )
}
