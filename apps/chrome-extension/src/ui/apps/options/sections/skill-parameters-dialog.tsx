import AddOutlined from '@mui/icons-material/AddOutlined'
import CloseOutlined from '@mui/icons-material/CloseOutlined'
import DeleteOutlineOutlined from '@mui/icons-material/DeleteOutlineOutlined'
import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography
} from '@mui/material'

import type { RouteSkillParameter } from '#~/shared/config.js'
import { useI18n } from '../../../i18n/provider.js'
import { ToolbarIcon } from '../shared.js'

type SkillParameterKind = 'query' | 'header'

export function SkillParametersDialog({
  headerParameters,
  onAddParameter,
  onClose,
  onDeleteParameter,
  onUpdateParameter,
  open,
  queryParameters,
  skillTitle
}: {
  headerParameters: RouteSkillParameter[]
  onAddParameter: (kind: SkillParameterKind) => void
  onClose: () => void
  onDeleteParameter: (kind: SkillParameterKind, parameterId: string) => void
  onUpdateParameter: (
    kind: SkillParameterKind,
    parameterId: string,
    patch: Partial<RouteSkillParameter>
  ) => void
  open: boolean
  queryParameters: RouteSkillParameter[]
  skillTitle: string
}) {
  const { t } = useI18n()

  return (
    <Dialog fullWidth maxWidth="md" onClose={onClose} open={open}>
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
          pr: 1
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {t('options.assets.skills.advancedMode')}
          </Typography>
          {skillTitle ? (
            <Typography noWrap variant="body2" color="text.secondary">
              {skillTitle}
            </Typography>
          ) : null}
        </Box>
        <IconButton
          aria-label={t('common.close')}
          onClick={onClose}
          size="small"
        >
          <CloseOutlined fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={1.5}>
          <SkillParameterPanel
            kind="query"
            onAdd={() => onAddParameter('query')}
            onDelete={(parameterId) =>
              onDeleteParameter('query', parameterId)
            }
            onUpdate={(parameterId, patch) =>
              onUpdateParameter('query', parameterId, patch)
            }
            parameters={queryParameters}
            title={t('options.assets.skills.queryParameters')}
          />
          <SkillParameterPanel
            kind="header"
            onAdd={() => onAddParameter('header')}
            onDelete={(parameterId) =>
              onDeleteParameter('header', parameterId)
            }
            onUpdate={(parameterId, patch) =>
              onUpdateParameter('header', parameterId, patch)
            }
            parameters={headerParameters}
            title={t('options.assets.skills.headerParameters')}
          />
        </Stack>
      </DialogContent>
    </Dialog>
  )
}

function SkillParameterPanel({
  kind,
  onAdd,
  onDelete,
  onUpdate,
  parameters,
  title
}: {
  kind: SkillParameterKind
  onAdd: () => void
  onDelete: (parameterId: string) => void
  onUpdate: (parameterId: string, patch: Partial<RouteSkillParameter>) => void
  parameters: RouteSkillParameter[]
  title: string
}) {
  const { t } = useI18n()

  return (
    <Stack spacing={1}>
      <Stack
        alignItems="center"
        direction="row"
        justifyContent="space-between"
        spacing={1}
      >
        <Typography variant="subtitle2">{title}</Typography>
        <ToolbarIcon
          label={t(
            kind === 'query'
              ? 'options.assets.skills.addQueryParameter'
              : 'options.assets.skills.addHeaderParameter'
          )}
          onClick={onAdd}
        >
          <AddOutlined fontSize="small" />
        </ToolbarIcon>
      </Stack>

      {parameters.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {t(
            kind === 'query'
              ? 'options.assets.skills.queryParametersEmpty'
              : 'options.assets.skills.headerParametersEmpty'
          )}
        </Typography>
      ) : (
        <Stack spacing={1}>
          {parameters.map((parameter) => (
            <Box
              key={parameter.id}
              sx={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) auto',
                gap: 0.75,
                alignItems: 'start'
              }}
            >
              <Box
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  overflow: 'hidden',
                  bgcolor: 'background.paper'
                }}
              >
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                      xs: 'minmax(0, 1fr) 116px',
                      md: 'minmax(0, 1fr) 132px'
                    }
                  }}
                >
                  <Box sx={{ px: 1.25, pt: 0.75, pb: 0.7 }}>
                    <Typography
                      color="text.secondary"
                      sx={{ display: 'block', mb: 0.35 }}
                      variant="caption"
                    >
                      {t('options.assets.skills.parameterKey')}
                    </Typography>
                    <TextField
                      hiddenLabel
                      onChange={(event) =>
                        onUpdate(parameter.id, { key: event.target.value })
                      }
                      placeholder={t('options.assets.skills.parameterKey')}
                      size="small"
                      sx={{
                        width: '100%',
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 0,
                          bgcolor: 'transparent'
                        },
                        '& .MuiOutlinedInput-notchedOutline': {
                          border: 'none'
                        },
                        '& .MuiOutlinedInput-input': {
                          px: 0,
                          py: 0
                        }
                      }}
                      value={parameter.key}
                    />
                  </Box>
                  <Box
                    sx={{
                      borderLeft: '1px solid',
                      borderColor: 'divider'
                    }}
                  >
                    <Box sx={{ px: 1.25, pt: 0.75, pb: 0.7 }}>
                      <Typography
                        color="text.secondary"
                        sx={{ display: 'block', mb: 0.35 }}
                        variant="caption"
                      >
                        {t('options.assets.skills.parameterType')}
                      </Typography>
                      <TextField
                        hiddenLabel
                        onChange={(event) =>
                          onUpdate(parameter.id, {
                            type: event.target.value as RouteSkillParameter['type']
                          })
                        }
                        select
                        size="small"
                        sx={{
                          width: '100%',
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 0,
                            bgcolor: 'transparent'
                          },
                          '& .MuiOutlinedInput-notchedOutline': {
                            border: 'none'
                          },
                          '& .MuiSelect-select': {
                            px: 0,
                            py: 0
                          }
                        }}
                        value={parameter.type}
                      >
                        <MenuItem value="string">
                          {t('options.assets.skills.parameterType.string')}
                        </MenuItem>
                        <MenuItem value="number">
                          {t('options.assets.skills.parameterType.number')}
                        </MenuItem>
                        <MenuItem value="boolean">
                          {t('options.assets.skills.parameterType.boolean')}
                        </MenuItem>
                      </TextField>
                    </Box>
                  </Box>
                </Box>
                <Box
                  sx={{
                    borderTop: '1px solid',
                    borderColor: 'divider'
                  }}
                >
                  <Box sx={{ px: 1.25, pt: 0.75, pb: 0.7 }}>
                    <Typography
                      color="text.secondary"
                      sx={{ display: 'block', mb: 0.35 }}
                      variant="caption"
                    >
                      {t('common.summary')}
                    </Typography>
                    <TextField
                      hiddenLabel
                      onChange={(event) =>
                        onUpdate(parameter.id, { summary: event.target.value })
                      }
                      placeholder={t('common.summary')}
                      size="small"
                      sx={{
                        width: '100%',
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 0,
                          bgcolor: 'transparent'
                        },
                        '& .MuiOutlinedInput-notchedOutline': {
                          border: 'none'
                        },
                        '& .MuiOutlinedInput-input': {
                          px: 0,
                          py: 0
                        }
                      }}
                      value={parameter.summary}
                    />
                  </Box>
                </Box>
              </Box>
              <Tooltip title={t('options.assets.deleteItem')}>
                <IconButton
                  aria-label={t('options.assets.deleteItem')}
                  onClick={() => onDelete(parameter.id)}
                  size="small"
                  sx={{ mt: 0.25 }}
                >
                  <DeleteOutlineOutlined fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          ))}
        </Stack>
      )}
    </Stack>
  )
}
