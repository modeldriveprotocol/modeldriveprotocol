import CheckOutlined from '@mui/icons-material/CheckOutlined'
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined'
import FolderOutlined from '@mui/icons-material/FolderOutlined'
import {
  Box,
  Breadcrumbs,
  ButtonBase,
  Divider,
  Menu,
  MenuItem,
  Stack,
  Typography
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import { Fragment, useEffect, useMemo, useState, type MouseEvent, type ReactNode } from 'react'

export interface SidepanelAssetPreviewEntry {
  path: string
  displayPath?: string
  contentKind: 'markdown' | 'code'
  content: string
}

export function SidepanelAssetPreview({
  entries,
  preferredPath,
  emptyLabel,
  pathLabel
}: {
  entries: SidepanelAssetPreviewEntry[]
  preferredPath?: string
  emptyLabel: string
  pathLabel: string
}) {
  const [selectedPath, setSelectedPath] = useState<string | undefined>(
    preferredPath ?? entries[0]?.path
  )
  const [scopeMenu, setScopeMenu] = useState<{
    anchor: HTMLElement
    currentNodeKey: string
    siblings: PreviewNode[]
  } | null>(null)

  useEffect(() => {
    if (entries.length === 0) {
      setSelectedPath(undefined)
      return
    }

    const currentExists = selectedPath
      ? entries.some((entry) => entry.path === selectedPath)
      : false

    if (currentExists) {
      return
    }

    const preferredEntry =
      entries.find((entry) => entry.path === preferredPath) ?? entries[0]

    setSelectedPath(preferredEntry?.path)
  }, [entries, preferredPath, selectedPath])

  const selectedEntry = useMemo(
    () => entries.find((entry) => entry.path === selectedPath) ?? entries[0],
    [entries, selectedPath]
  )
  const previewTree = useMemo(() => buildPreviewTree(entries), [entries])
  const selectedTrail = useMemo(
    () =>
      selectedEntry
        ? findPreviewTrail(
            previewTree,
            getBreadcrumbSegments(selectedEntry.displayPath ?? selectedEntry.path)
          )
        : [],
    [previewTree, selectedEntry]
  )

  if (!selectedEntry) {
    return (
      <Box sx={previewFrameSx}>
        <Typography variant="body2" color="text.secondary">
          {emptyLabel}
        </Typography>
      </Box>
    )
  }

  const selectedDisplayPath = selectedEntry.displayPath ?? selectedEntry.path
  const breadcrumbDisplaySegments = getBreadcrumbSegments(selectedDisplayPath)

  return (
    <Box sx={previewFrameSx}>
      <Box sx={pathTriggerSx}>
        <Breadcrumbs
          aria-label={pathLabel}
          separator={
            <Typography component="span" sx={{ color: 'text.disabled', fontSize: 12 }}>
              ›
            </Typography>
          }
          sx={{
            flex: 1,
            minWidth: 0,
            '& .MuiBreadcrumbs-separator': {
              mx: 0.5
            }
          }}
        >
          {breadcrumbDisplaySegments.map((segment, index) => {
            const node = selectedTrail[index]
            const siblings = index === 0
              ? previewTree.children
              : getFolderChildren(selectedTrail[index - 1])

            return (
              <ButtonBase
                key={`${segment}-${index}`}
                aria-label={`${pathLabel}: ${selectedEntry.path}`}
                onClick={(event) => {
                  if (!node || siblings.length === 0) {
                    return
                  }
                  setScopeMenu({
                    anchor: event.currentTarget,
                    currentNodeKey: node.key,
                    siblings
                  })
                }}
                sx={pathSegmentButtonSx}
              >
                <Typography
                  noWrap
                  sx={{
                    maxWidth: 180,
                    fontSize: 12,
                    lineHeight: 1.5,
                    fontFamily:
                      'ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, monospace',
                    color:
                      index === breadcrumbDisplaySegments.length - 1
                        ? 'text.primary'
                        : 'text.secondary',
                    fontWeight: index === breadcrumbDisplaySegments.length - 1 ? 600 : 500
                  }}
                >
                  {segment}
                </Typography>
              </ButtonBase>
            )
          })}
        </Breadcrumbs>
      </Box>
      <Divider />
      <Box sx={contentAreaSx}>
        {selectedEntry.contentKind === 'markdown' ? (
          <MarkdownPreview markdown={selectedEntry.content} />
        ) : (
          <CodePreview code={selectedEntry.content} />
        )}
      </Box>
      <Menu
        anchorEl={scopeMenu?.anchor ?? null}
        open={Boolean(scopeMenu)}
        onClose={() => setScopeMenu(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        {(scopeMenu?.siblings ?? []).map((node) => (
          <MenuItem
            key={node.key}
            selected={node.key === scopeMenu?.currentNodeKey}
            onClick={() => {
              const nextPath = resolveNodeSelection(node)
              if (nextPath) {
                setSelectedPath(nextPath)
              }
              setScopeMenu(null)
            }}
            sx={{ minWidth: 280, gap: 1 }}
          >
            <Box sx={{ width: 16, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
              {node.key === scopeMenu?.currentNodeKey ? (
                <CheckOutlined sx={{ fontSize: 16 }} />
              ) : null}
            </Box>
            {node.kind === 'folder' ? (
              <FolderOutlined sx={{ fontSize: 16, color: 'text.secondary' }} />
            ) : (
              <DescriptionOutlined sx={{ fontSize: 16, color: 'text.secondary' }} />
            )}
            <Typography
              variant="body2"
              sx={{
                fontFamily:
                  'ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, monospace'
              }}
            >
              {node.label}
            </Typography>
          </MenuItem>
        ))}
      </Menu>
    </Box>
  )
}

function MarkdownPreview({ markdown }: { markdown: string }) {
  const blocks = useMemo(() => parseMarkdownBlocks(markdown), [markdown])

  if (blocks.length === 0) {
    return null
  }

  return (
    <Stack spacing={1}>
      {blocks.map((block, index) => {
        switch (block.kind) {
          case 'heading':
            return (
              <Typography
                key={`heading-${index}`}
                variant={block.level === 1 ? 'subtitle1' : 'subtitle2'}
                sx={{ fontWeight: 700 }}
              >
                {renderInlineMarkdown(block.text)}
              </Typography>
            )
          case 'paragraph':
            return (
              <Typography key={`paragraph-${index}`} variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {renderInlineMarkdown(block.text)}
              </Typography>
            )
          case 'list':
            return (
              <Box
                key={`list-${index}`}
                component={block.ordered ? 'ol' : 'ul'}
                sx={{
                  m: 0,
                  pl: block.ordered ? 2.5 : 2.25,
                  '& li + li': {
                    mt: 0.5
                  }
                }}
              >
                {block.items.map((item, itemIndex) => (
                  <Box key={`list-item-${index}-${itemIndex}`} component="li" sx={{ color: 'text.secondary' }}>
                    <Typography variant="body2" component="span" sx={{ color: 'text.primary' }}>
                      {renderInlineMarkdown(item)}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )
          case 'code':
            return (
              <Box
                key={`code-${index}`}
                component="pre"
                sx={codePreviewSx}
              >
                {block.text}
              </Box>
            )
        }
      })}
    </Stack>
  )
}

function CodePreview({ code }: { code: string }) {
  return (
    <Box component="pre" sx={codePreviewSx}>
      {code}
    </Box>
  )
}

type MarkdownBlock =
  | { kind: 'heading'; level: number; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'list'; ordered: boolean; items: string[] }
  | { kind: 'code'; text: string }

type PreviewFolderNode = {
  kind: 'folder'
  key: string
  label: string
  children: PreviewNode[]
}

type PreviewFileNode = {
  kind: 'file'
  key: string
  label: string
  path: string
}

type PreviewNode = PreviewFolderNode | PreviewFileNode

function parseMarkdownBlocks(markdown: string): MarkdownBlock[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const blocks: MarkdownBlock[] = []
  let index = 0

  while (index < lines.length) {
    const line = lines[index] ?? ''
    const trimmed = line.trim()

    if (!trimmed) {
      index += 1
      continue
    }

    if (trimmed.startsWith('```')) {
      const codeLines: string[] = []
      index += 1
      while (index < lines.length && !(lines[index] ?? '').trim().startsWith('```')) {
        codeLines.push(lines[index] ?? '')
        index += 1
      }
      index += 1
      blocks.push({ kind: 'code', text: codeLines.join('\n') })
      continue
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/)
    if (headingMatch) {
      blocks.push({
        kind: 'heading',
        level: headingMatch[1].length,
        text: headingMatch[2]
      })
      index += 1
      continue
    }

    const unorderedMatch = trimmed.match(/^[-*]\s+(.*)$/)
    if (unorderedMatch) {
      const items: string[] = []
      while (index < lines.length) {
        const nextTrimmed = (lines[index] ?? '').trim()
        const match = nextTrimmed.match(/^[-*]\s+(.*)$/)
        if (!match) {
          break
        }
        items.push(match[1])
        index += 1
      }
      blocks.push({ kind: 'list', ordered: false, items })
      continue
    }

    const orderedMatch = trimmed.match(/^\d+\.\s+(.*)$/)
    if (orderedMatch) {
      const items: string[] = []
      while (index < lines.length) {
        const nextTrimmed = (lines[index] ?? '').trim()
        const match = nextTrimmed.match(/^\d+\.\s+(.*)$/)
        if (!match) {
          break
        }
        items.push(match[1])
        index += 1
      }
      blocks.push({ kind: 'list', ordered: true, items })
      continue
    }

    const paragraphLines = [trimmed]
    index += 1
    while (index < lines.length) {
      const nextTrimmed = (lines[index] ?? '').trim()
      if (
        !nextTrimmed ||
        nextTrimmed.startsWith('```') ||
        /^(#{1,6})\s+/.test(nextTrimmed) ||
        /^[-*]\s+/.test(nextTrimmed) ||
        /^\d+\.\s+/.test(nextTrimmed)
      ) {
        break
      }
      paragraphLines.push(nextTrimmed)
      index += 1
    }
    blocks.push({ kind: 'paragraph', text: paragraphLines.join(' ') })
  }

  return blocks
}

function renderInlineMarkdown(text: string): ReactNode[] {
  const parts = text.split(/(`[^`]+`)/g)

  return parts.map((part, index) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <Box
          key={`inline-code-${index}`}
          component="code"
          sx={{
            px: 0.5,
            py: 0.125,
            borderRadius: '4px',
            bgcolor: (theme) => alpha(theme.palette.text.primary, 0.08),
            fontFamily:
              'ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, monospace',
            fontSize: '0.875em'
          }}
        >
          {part.slice(1, -1)}
        </Box>
      )
    }

    return <Fragment key={`inline-text-${index}`}>{part}</Fragment>
  })
}

function getBreadcrumbSegments(path: string): string[] {
  return path.split('/').filter(Boolean)
}

function buildPreviewTree(entries: SidepanelAssetPreviewEntry[]): PreviewFolderNode {
  const root: PreviewFolderNode = {
    kind: 'folder',
    key: '__root__',
    label: '',
    children: []
  }

  for (const entry of entries) {
    const segments = getBreadcrumbSegments(entry.displayPath ?? entry.path)
    let current = root

    for (const [index, segment] of segments.entries()) {
      const isLeaf = index === segments.length - 1

      if (isLeaf) {
        current.children.push({
          kind: 'file',
          key: entry.path,
          label: segment,
          path: entry.path
        })
        continue
      }

      const existing = current.children.find(
        (child): child is Extract<PreviewNode, { kind: 'folder' }> =>
          child.kind === 'folder' && child.label === segment
      )

      if (existing) {
        current = existing
        continue
      }

      const nextFolder: PreviewFolderNode = {
        kind: 'folder',
        key: `${current.key}/${segment}`,
        label: segment,
        children: []
      }
      current.children.push(nextFolder)
      current = nextFolder
    }
  }

  sortPreviewTree(root)
  return root
}

function sortPreviewTree(node: PreviewNode): void {
  if (node.kind !== 'folder') {
    return
  }

  node.children.sort((left, right) => {
    if (left.kind !== right.kind) {
      return left.kind === 'folder' ? -1 : 1
    }
    if (left.label === 'SKILL.md') {
      return -1
    }
    if (right.label === 'SKILL.md') {
      return 1
    }
    return left.label.localeCompare(right.label)
  })

  for (const child of node.children) {
    sortPreviewTree(child)
  }
}

function findPreviewTrail(root: PreviewNode, segments: string[]): PreviewNode[] {
  const trail: PreviewNode[] = []
  let current = root

  for (const segment of segments) {
    if (current.kind !== 'folder') {
      break
    }
    const next = current.children.find((child) => child.label === segment)
    if (!next) {
      break
    }
    trail.push(next)
    current = next
  }

  return trail
}

function resolveNodeSelection(node: PreviewNode): string | undefined {
  if (node.kind === 'file') {
    return node.path
  }

  const directSkill = node.children.find(
    (child): child is Extract<PreviewNode, { kind: 'file' }> =>
      child.kind === 'file' && child.label === 'SKILL.md'
  )

  if (directSkill) {
    return directSkill.path
  }

  for (const child of node.children) {
    const nextPath = resolveNodeSelection(child)
    if (nextPath) {
      return nextPath
    }
  }

  return undefined
}

function getFolderChildren(node: PreviewNode | undefined): PreviewNode[] {
  return node?.kind === 'folder' ? node.children : []
}

const previewFrameSx = {
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: '4px !important',
  overflow: 'hidden',
  minHeight: 0
}

const pathTriggerSx = {
  minHeight: 32,
  px: 1.25,
  display: 'flex',
  alignItems: 'center',
  width: '100%',
  bgcolor: (theme: { palette: { text: { primary: string } } }) =>
    alpha(theme.palette.text.primary, 0.04)
}

const pathSegmentButtonSx = {
  minWidth: 0,
  borderRadius: '4px',
  px: 0.25,
  justifyContent: 'flex-start'
}

const contentAreaSx = {
  px: 1.25,
  py: 1,
  maxHeight: 260,
  overflow: 'auto'
}

const codePreviewSx = {
  m: 0,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  fontFamily:
    'ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, monospace',
  fontSize: 12,
  lineHeight: 1.6,
  color: 'text.primary'
}
