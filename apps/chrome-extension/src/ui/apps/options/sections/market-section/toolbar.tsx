import ExpandMoreOutlined from '@mui/icons-material/ExpandMoreOutlined'
import RefreshOutlined from '@mui/icons-material/RefreshOutlined'
import SearchOutlined from '@mui/icons-material/SearchOutlined'
import {
  Button,
  InputAdornment,
  Stack,
  TextField,
  Typography
} from '@mui/material'

export function MarketToolbar({
  controlsExpanded,
  loading,
  pendingUpdateCount,
  search,
  onRefresh,
  onSearchChange,
  onToggleControlsExpanded,
  t
}: {
  controlsExpanded: boolean
  loading: boolean
  pendingUpdateCount: number
  search: string
  onRefresh: () => void
  onSearchChange: (value: string) => void
  onToggleControlsExpanded: () => void
  t: (key: string, values?: Record<string, string | number>) => string
}) {
  return (
    <Stack spacing={pendingUpdateCount > 0 ? 0.75 : 0} sx={{ pt: 1, pb: 0 }}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <TextField
          fullWidth
          size="small"
          placeholder={t('options.market.search')}
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchOutlined fontSize="small" />
              </InputAdornment>
            )
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              height: 40
            }
          }}
        />
        <Button
          aria-label={t('options.market.refreshSources')}
          disabled={loading}
          variant="contained"
          onClick={onRefresh}
          sx={{
            width: 40,
            minWidth: 40,
            height: 40,
            p: 0
          }}
        >
          <RefreshOutlined fontSize="small" />
        </Button>
        <Button
          aria-label={
            controlsExpanded
              ? t('options.market.hideSources')
              : t('options.market.showSources')
          }
          variant="outlined"
          onClick={onToggleControlsExpanded}
          sx={{
            width: 40,
            minWidth: 40,
            height: 40,
            p: 0
          }}
        >
          <ExpandMoreOutlined
            fontSize="small"
            sx={{
              transform: controlsExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 120ms ease'
            }}
          />
        </Button>
      </Stack>

      {pendingUpdateCount > 0 ? (
        <Typography variant="caption" color="text.secondary">
          {t('options.market.pendingUpdates', { count: pendingUpdateCount })}
        </Typography>
      ) : null}
    </Stack>
  )
}

