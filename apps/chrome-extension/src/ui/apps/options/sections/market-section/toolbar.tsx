import CloseOutlined from '@mui/icons-material/CloseOutlined'
import ExpandMoreOutlined from '@mui/icons-material/ExpandMoreOutlined'
import RefreshOutlined from '@mui/icons-material/RefreshOutlined'
import SearchOutlined from '@mui/icons-material/SearchOutlined'
import {
  ButtonBase,
  Button,
  InputAdornment,
  type SxProps,
  Stack,
  TextField,
  type Theme,
  Typography
} from '@mui/material'
import type { RefObject } from 'react'

export function MarketToolbar({
  controlsExpanded,
  loading,
  pendingUpdateCount,
  search,
  searchInputRef,
  statusText,
  shortcutText,
  onRefresh,
  onSearchChange,
  onSelectNextResult,
  onSelectPreviousResult,
  onSubmitSearch,
  onToggleControlsExpanded,
  t
}: {
  controlsExpanded: boolean
  loading: boolean
  pendingUpdateCount: number
  search: string
  searchInputRef?: RefObject<HTMLInputElement | null>
  statusText?: string
  shortcutText?: string
  onRefresh: () => void
  onSearchChange: (value: string) => void
  onSelectNextResult?: () => void
  onSelectPreviousResult?: () => void
  onSubmitSearch?: () => void
  onToggleControlsExpanded: () => void
  t: (key: string, values?: Record<string, string | number>) => string
}) {
  const compactActionButtonSx: SxProps<Theme> = {
    minWidth: 0,
    px: 0.75
  }

  return (
    <Stack spacing={pendingUpdateCount > 0 ? 0.75 : 0} sx={{ pt: 1, pb: 0 }}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <TextField
          fullWidth
          size="small"
          inputRef={searchInputRef}
          placeholder={t('options.market.search')}
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape' && search) {
              event.preventDefault()
              onSearchChange('')
              return
            }

            if (event.key === 'Enter' && onSubmitSearch) {
              event.preventDefault()
              onSubmitSearch()
              return
            }

            if (event.key === 'ArrowDown' && onSelectNextResult) {
              event.preventDefault()
              onSelectNextResult()
              return
            }

            if (event.key === 'ArrowUp' && onSelectPreviousResult) {
              event.preventDefault()
              onSelectPreviousResult()
            }
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchOutlined fontSize="small" />
              </InputAdornment>
            ),
            ...(search
              ? {
                  endAdornment: (
                    <InputAdornment position="end">
                      <ButtonBase
                        aria-label={t('options.market.clearSearch')}
                        onClick={() => onSearchChange('')}
                        sx={{
                          width: 24,
                          height: 24,
                          borderRadius: '4px',
                          color: 'text.secondary'
                        }}
                      >
                        <CloseOutlined sx={{ fontSize: 16 }} />
                      </ButtonBase>
                    </InputAdornment>
                  )
                }
              : {})
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

      {statusText ? (
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={1}
          sx={{ minHeight: 20 }}
        >
          <Typography variant="caption" color="text.secondary" sx={{ minWidth: 0 }}>
            {statusText}
          </Typography>
          {shortcutText ? (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ flexShrink: 0 }}
            >
              {shortcutText}
            </Typography>
          ) : null}
        </Stack>
      ) : null}

      {pendingUpdateCount > 0 ? (
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={1}
          sx={{
            px: 1,
            py: 0.75,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: '4px',
            bgcolor: 'background.paper'
          }}
        >
          <Typography variant="caption" color="text.secondary" sx={{ minWidth: 0 }}>
            {t('options.market.pendingUpdates', { count: pendingUpdateCount })}
          </Typography>
          <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
            <Button
              size="small"
              onClick={onRefresh}
              disabled={loading}
              sx={compactActionButtonSx}
            >
              {t('options.market.refreshSources')}
            </Button>
            <Button
              size="small"
              onClick={onToggleControlsExpanded}
              sx={compactActionButtonSx}
            >
              {controlsExpanded
                ? t('options.market.hideSources')
                : t('options.market.showSources')}
            </Button>
          </Stack>
        </Stack>
      ) : null}
    </Stack>
  )
}
