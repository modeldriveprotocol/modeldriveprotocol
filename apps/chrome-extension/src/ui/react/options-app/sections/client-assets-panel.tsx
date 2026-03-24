import AddOutlined from '@mui/icons-material/AddOutlined'
import DeleteOutlineOutlined from '@mui/icons-material/DeleteOutlineOutlined'
import { Box, List, ListItem, ListItemButton, ListItemText, Stack, Tab, Tabs, TextField, Typography } from '@mui/material'
import { useEffect, useState } from 'react'

import type { ClientIconKey, ExtensionConfig, RouteClientConfig } from '#~/shared/config.js'
import type { OptionsAssetsTab } from '../../extension-api.js'
import { useI18n } from '../../i18n.js'
import { IconPicker } from '../icon-picker.js'
import { ToolbarIcon } from '../shared.js'
import { createLocalId, formatSurfaceUrlLabel } from '../types.js'

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
  const [selectedFlowId, setSelectedFlowId] = useState<string>()
  const [selectedResourceId, setSelectedResourceId] = useState<string>()
  const [selectedSkillId, setSelectedSkillId] = useState<string>()

  function updateClient(next: RouteClientConfig) {
    onChange({
      ...draft,
      routeClients: draft.routeClients.map((item) => (item.id === next.id ? next : item))
    })
  }

  useEffect(() => {
    setTab(initialTab ?? 'flows')
  }, [client.id, initialTab])
  useEffect(() => {
    setSelectedFlowId((current) => (current && client.recordings.some((recording) => recording.id === current) ? current : client.recordings[0]?.id))
  }, [client.id, client.recordings])
  useEffect(() => {
    setSelectedResourceId((current) => (current && client.selectorResources.some((resource) => resource.id === current) ? current : client.selectorResources[0]?.id))
  }, [client.id, client.selectorResources])
  useEffect(() => {
    setSelectedSkillId((current) => (current && client.skillEntries.some((skill) => skill.id === current) ? current : client.skillEntries[0]?.id))
  }, [client.id, client.skillEntries])

  const selectedFlow = client.recordings.find((recording) => recording.id === selectedFlowId) ?? client.recordings[0]
  const selectedResource = client.selectorResources.find((resource) => resource.id === selectedResourceId) ?? client.selectorResources[0]
  const selectedSkill = client.skillEntries.find((skill) => skill.id === selectedSkillId) ?? client.skillEntries[0]

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
    updateClient({ ...client, selectorResources: [...client.selectorResources, nextResource] })
    setTab('resources')
    setSelectedResourceId(nextResource.id)
  }

  function addSkill() {
    const nextSkill: RouteClientConfig['skillEntries'][number] = {
      id: createLocalId('skill'),
      path: '',
      title: t('options.assets.skills.newTitle'),
      summary: '',
      icon: 'spark' as ClientIconKey,
      content: ''
    }
    updateClient({ ...client, skillEntries: [...client.skillEntries, nextSkill] })
    setTab('skills')
    setSelectedSkillId(nextSkill.id)
  }

  return (
    <Stack spacing={1.25}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{t('options.assets.title')}</Typography>
          <Typography variant="body2" color="text.secondary">{t('options.assets.description')}</Typography>
        </Box>
        <Stack direction="row" spacing={0.5}>
          {tab === 'resources' ? <ToolbarIcon label={t('options.assets.addResource')} onClick={() => addResource()}><AddOutlined fontSize="small" /></ToolbarIcon> : null}
          {tab === 'skills' ? <ToolbarIcon label={t('options.assets.addSkill')} onClick={() => addSkill()}><AddOutlined fontSize="small" /></ToolbarIcon> : null}
        </Stack>
      </Stack>

      <Box sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
        <Tabs value={tab} onChange={(_event, next) => setTab(next)} variant="scrollable" scrollButtons={false}>
          <Tab value="flows" label={t('options.assets.tab.flows', { count: client.recordings.length })} />
          <Tab value="resources" label={t('options.assets.tab.resources', { count: client.selectorResources.length })} />
          <Tab value="skills" label={t('options.assets.tab.skills', { count: client.skillEntries.length })} />
        </Tabs>
      </Box>

      {tab === 'flows' && selectedFlow ? (
        <Stack spacing={1.25}>
          <List dense disablePadding>
            {client.recordings.map((recording) => (
              <ListItem key={recording.id} disablePadding>
                <ListItemButton selected={selectedFlow.id === recording.id} onClick={() => setSelectedFlowId(recording.id)}>
                  <ListItemText primary={recording.name} secondary={t('options.assets.flows.steps', { count: recording.steps.length })} primaryTypographyProps={{ variant: 'body2', fontWeight: 600, noWrap: true }} secondaryTypographyProps={{ variant: 'caption' }} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 1, alignItems: 'start' }}>
            <TextField size="small" label={t('options.assets.flows.name')} value={selectedFlow.name} onChange={(event) => updateClient({ ...client, recordings: client.recordings.map((item) => item.id === selectedFlow.id ? { ...item, name: event.target.value } : item) })} />
            <ToolbarIcon label={t('options.assets.deleteItem')} onClick={() => updateClient({ ...client, recordings: client.recordings.filter((item) => item.id !== selectedFlow.id) })}><DeleteOutlineOutlined fontSize="small" /></ToolbarIcon>
          </Box>
          <TextField size="small" label={t('common.description')} value={selectedFlow.description} onChange={(event) => updateClient({ ...client, recordings: client.recordings.map((item) => item.id === selectedFlow.id ? { ...item, description: event.target.value } : item) })} />
          <Typography variant="caption" color="text.secondary">{[t('options.assets.flows.steps', { count: selectedFlow.steps.length }), selectedFlow.startUrl ? `${t('options.assets.flows.startUrl')}: ${formatSurfaceUrlLabel(selectedFlow.startUrl)}` : undefined, selectedFlow.capturedFeatures.length ? `${t('options.assets.flows.features')}: ${selectedFlow.capturedFeatures.length}` : undefined].filter(Boolean).join(' · ')}</Typography>
        </Stack>
      ) : null}

      {tab === 'resources' && selectedResource ? (
        <Stack spacing={1.25}>
          <List dense disablePadding>
            {client.selectorResources.map((resource) => (
              <ListItem key={resource.id} disablePadding>
                <ListItemButton selected={selectedResource.id === resource.id} onClick={() => setSelectedResourceId(resource.id)}>
                  <ListItemText primary={resource.name} secondary={resource.selector || t('options.assets.resources.selector')} primaryTypographyProps={{ variant: 'body2', fontWeight: 600, noWrap: true }} secondaryTypographyProps={{ variant: 'caption', noWrap: true }} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 1, alignItems: 'start' }}>
            <TextField size="small" label={t('options.assets.resources.name')} value={selectedResource.name} onChange={(event) => updateClient({ ...client, selectorResources: client.selectorResources.map((item) => item.id === selectedResource.id ? { ...item, name: event.target.value } : item) })} />
            <ToolbarIcon label={t('options.assets.deleteItem')} onClick={() => updateClient({ ...client, selectorResources: client.selectorResources.filter((item) => item.id !== selectedResource.id) })}><DeleteOutlineOutlined fontSize="small" /></ToolbarIcon>
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1 }}>
            <TextField size="small" label={t('options.assets.resources.selector')} value={selectedResource.selector} onChange={(event) => updateClient({ ...client, selectorResources: client.selectorResources.map((item) => item.id === selectedResource.id ? { ...item, selector: event.target.value } : item) })} />
            <TextField size="small" label={t('options.assets.resources.tagName')} value={selectedResource.tagName} onChange={(event) => updateClient({ ...client, selectorResources: client.selectorResources.map((item) => item.id === selectedResource.id ? { ...item, tagName: event.target.value } : item) })} />
          </Box>
          <TextField size="small" label={t('common.description')} value={selectedResource.description} onChange={(event) => updateClient({ ...client, selectorResources: client.selectorResources.map((item) => item.id === selectedResource.id ? { ...item, description: event.target.value } : item) })} />
          <TextField size="small" label={t('options.assets.resources.text')} value={selectedResource.text ?? ''} onChange={(event) => updateClient({ ...client, selectorResources: client.selectorResources.map((item) => item.id === selectedResource.id ? { ...item, text: event.target.value || undefined } : item) })} />
          <TextField size="small" label={t('options.assets.resources.alternativeSelectors')} multiline minRows={3} value={selectedResource.alternativeSelectors.join('\n')} onChange={(event) => updateClient({ ...client, selectorResources: client.selectorResources.map((item) => item.id === selectedResource.id ? { ...item, alternativeSelectors: event.target.value.split(/\r?\n/g).map((value) => value.trim()).filter(Boolean) } : item) })} />
          <TextField size="small" label={t('options.assets.resources.classes')} value={selectedResource.classes.join(', ')} onChange={(event) => updateClient({ ...client, selectorResources: client.selectorResources.map((item) => item.id === selectedResource.id ? { ...item, classes: event.target.value.split(',').map((value) => value.trim()).filter(Boolean) } : item) })} />
        </Stack>
      ) : null}

      {tab === 'skills' && selectedSkill ? (
        <Stack spacing={1.25}>
          <List dense disablePadding>
            {client.skillEntries.map((skill) => (
              <ListItem key={skill.id} disablePadding>
                <ListItemButton selected={selectedSkill.id === skill.id} onClick={() => setSelectedSkillId(skill.id)}>
                  <ListItemText primary={skill.title || skill.path || t('options.assets.skills.newTitle')} secondary={skill.path || t('options.assets.skills.path')} primaryTypographyProps={{ variant: 'body2', fontWeight: 600, noWrap: true }} secondaryTypographyProps={{ variant: 'caption', noWrap: true }} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 1, alignItems: 'start' }}>
            <TextField size="small" label={t('options.assets.skills.titleField')} value={selectedSkill.title} onChange={(event) => updateClient({ ...client, skillEntries: client.skillEntries.map((item) => item.id === selectedSkill.id ? { ...item, title: event.target.value } : item) })} />
            <ToolbarIcon label={t('options.assets.deleteItem')} onClick={() => updateClient({ ...client, skillEntries: client.skillEntries.filter((item) => item.id !== selectedSkill.id) })}><DeleteOutlineOutlined fontSize="small" /></ToolbarIcon>
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 180px', gap: 1 }}>
            <TextField size="small" label={t('options.assets.skills.path')} value={selectedSkill.path} onChange={(event) => updateClient({ ...client, skillEntries: client.skillEntries.map((item) => item.id === selectedSkill.id ? { ...item, path: event.target.value } : item) })} />
            <IconPicker label={t('common.icon')} value={selectedSkill.icon} onChange={(icon) => updateClient({ ...client, skillEntries: client.skillEntries.map((item) => item.id === selectedSkill.id ? { ...item, icon } : item) })} />
          </Box>
          <TextField size="small" label={t('common.summary')} value={selectedSkill.summary} onChange={(event) => updateClient({ ...client, skillEntries: client.skillEntries.map((item) => item.id === selectedSkill.id ? { ...item, summary: event.target.value } : item) })} />
          <TextField size="small" label={t('options.assets.skills.content')} multiline minRows={10} value={selectedSkill.content} onChange={(event) => updateClient({ ...client, skillEntries: client.skillEntries.map((item) => item.id === selectedSkill.id ? { ...item, content: event.target.value } : item) })} />
        </Stack>
      ) : null}
    </Stack>
  )
}
