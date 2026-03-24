import AddOutlined from '@mui/icons-material/AddOutlined'
import DeleteOutlineOutlined from '@mui/icons-material/DeleteOutlineOutlined'
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography
} from '@mui/material'
import { useEffect, useState } from 'react'

import type { ExtensionConfig, RouteClientConfig } from '#~/shared/config.js'
import type { OptionsAssetsTab } from '../../../platform/extension-api.js'
import { useI18n } from '../../../i18n/provider.js'
import { ToolbarIcon } from '../shared.js'
import { createLocalId } from '../types.js'
import { ClientFlowsPanel } from './client-flows-panel.js'
import { ClientSkillsPanel } from './client-skills-panel.js'

export function ClientAssetsPanel({
  client,
  draft,
  initialTab,
  onChange
}: {
  client: RouteClientConfig
  draft: ExtensionConfig
  initialTab: OptionsAssetsTab | undefined
  onChange: (config: ExtensionConfig) => void
}) {
  const { t } = useI18n()
  const [tab, setTab] = useState<'flows' | 'resources' | 'skills'>('flows')
  const [selectedResourceId, setSelectedResourceId] = useState<string>()

  function updateClient(next: RouteClientConfig) {
    onChange({
      ...draft,
      routeClients: draft.routeClients.map((item) =>
        item.id === next.id ? next : item
      )
    })
  }

  useEffect(() => {
    setTab(initialTab ?? 'flows')
  }, [client.id, initialTab])
  useEffect(() => {
    setSelectedResourceId((current) =>
      current &&
      client.selectorResources.some((resource) => resource.id === current)
        ? current
        : client.selectorResources[0]?.id
    )
  }, [client.id, client.selectorResources])

  const selectedResource =
    client.selectorResources.find(
      (resource) => resource.id === selectedResourceId
    ) ?? client.selectorResources[0]

  function addResource() {
    const nextResource: RouteClientConfig['selectorResources'][number] = {
      id: createLocalId('resource'),
      name: t('options.assets.resources.newName'),
      description: '',
      createdAt: new Date().toISOString(),
      selector: '',
      alternativeSelectors: [],
      tagName: '',
      classes: [],
      attributes: {}
    }
    updateClient({
      ...client,
      selectorResources: [...client.selectorResources, nextResource]
    })
    setTab('resources')
    setSelectedResourceId(nextResource.id)
  }

  return (
    <Stack spacing={1.25}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        spacing={1}
      >
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            {t('options.assets.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('options.assets.description')}
          </Typography>
        </Box>
        <Stack direction="row" spacing={0.5}>
          {tab === 'resources' ? (
            <ToolbarIcon
              label={t('options.assets.addResource')}
              onClick={() => addResource()}
            >
              <AddOutlined fontSize="small" />
            </ToolbarIcon>
          ) : null}
        </Stack>
      </Stack>

      <Box sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
        <Tabs
          value={tab}
          onChange={(_event, next) => setTab(next)}
          variant="scrollable"
          scrollButtons={false}
        >
          <Tab
            value="flows"
            label={t('options.assets.tab.flows', {
              count: client.recordings.length
            })}
          />
          <Tab
            value="resources"
            label={t('options.assets.tab.resources', {
              count: client.selectorResources.length
            })}
          />
          <Tab
            value="skills"
            label={t('options.assets.tab.skills', {
              count: client.skillEntries.length
            })}
          />
        </Tabs>
      </Box>

      {tab === 'flows' ? (
        <ClientFlowsPanel client={client} onChange={updateClient} />
      ) : null}

      {tab === 'resources' && selectedResource ? (
        <Stack spacing={1.25}>
          <List dense disablePadding>
            {client.selectorResources.map((resource) => (
              <ListItem key={resource.id} disablePadding>
                <ListItemButton
                  selected={selectedResource.id === resource.id}
                  onClick={() => setSelectedResourceId(resource.id)}
                >
                  <ListItemText
                    primary={resource.name}
                    secondary={
                      resource.selector ||
                      t('options.assets.resources.selector')
                    }
                    primaryTypographyProps={{
                      variant: 'body2',
                      fontWeight: 600,
                      noWrap: true
                    }}
                    secondaryTypographyProps={{
                      variant: 'caption',
                      noWrap: true
                    }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) auto',
              gap: 1,
              alignItems: 'start'
            }}
          >
            <TextField
              size="small"
              label={t('options.assets.resources.name')}
              value={selectedResource.name}
              onChange={(event) =>
                updateClient({
                  ...client,
                  selectorResources: client.selectorResources.map((item) =>
                    item.id === selectedResource.id
                      ? { ...item, name: event.target.value }
                      : item
                  )
                })
              }
            />
            <ToolbarIcon
              label={t('options.assets.deleteItem')}
              onClick={() =>
                updateClient({
                  ...client,
                  selectorResources: client.selectorResources.filter(
                    (item) => item.id !== selectedResource.id
                  )
                })
              }
            >
              <DeleteOutlineOutlined fontSize="small" />
            </ToolbarIcon>
          </Box>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: 1
            }}
          >
            <TextField
              size="small"
              label={t('options.assets.resources.selector')}
              value={selectedResource.selector}
              onChange={(event) =>
                updateClient({
                  ...client,
                  selectorResources: client.selectorResources.map((item) =>
                    item.id === selectedResource.id
                      ? { ...item, selector: event.target.value }
                      : item
                  )
                })
              }
            />
            <TextField
              size="small"
              label={t('options.assets.resources.tagName')}
              value={selectedResource.tagName}
              onChange={(event) =>
                updateClient({
                  ...client,
                  selectorResources: client.selectorResources.map((item) =>
                    item.id === selectedResource.id
                      ? { ...item, tagName: event.target.value }
                      : item
                  )
                })
              }
            />
          </Box>
          <TextField
            size="small"
            label={t('common.description')}
            value={selectedResource.description}
            onChange={(event) =>
              updateClient({
                ...client,
                selectorResources: client.selectorResources.map((item) =>
                  item.id === selectedResource.id
                    ? { ...item, description: event.target.value }
                    : item
                )
              })
            }
          />
          <TextField
            size="small"
            label={t('options.assets.resources.text')}
            value={selectedResource.text ?? ''}
            onChange={(event) =>
              updateClient({
                ...client,
                selectorResources: client.selectorResources.map((item) =>
                  item.id === selectedResource.id
                    ? { ...item, text: event.target.value || undefined }
                    : item
                )
              })
            }
          />
          <TextField
            size="small"
            label={t('options.assets.resources.alternativeSelectors')}
            multiline
            minRows={3}
            value={selectedResource.alternativeSelectors.join('\n')}
            onChange={(event) =>
              updateClient({
                ...client,
                selectorResources: client.selectorResources.map((item) =>
                  item.id === selectedResource.id
                    ? {
                        ...item,
                        alternativeSelectors: event.target.value
                          .split(/\r?\n/g)
                          .map((value) => value.trim())
                          .filter(Boolean)
                      }
                    : item
                )
              })
            }
          />
          <TextField
            size="small"
            label={t('options.assets.resources.classes')}
            value={selectedResource.classes.join(', ')}
            onChange={(event) =>
              updateClient({
                ...client,
                selectorResources: client.selectorResources.map((item) =>
                  item.id === selectedResource.id
                    ? {
                        ...item,
                        classes: event.target.value
                          .split(',')
                          .map((value) => value.trim())
                          .filter(Boolean)
                      }
                    : item
                )
              })
            }
          />
        </Stack>
      ) : null}

      {tab === 'skills' ? (
        <ClientSkillsPanel client={client} onChange={updateClient} />
      ) : null}
    </Stack>
  )
}
