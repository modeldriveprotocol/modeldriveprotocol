import CloseOutlined from '@mui/icons-material/CloseOutlined'
import SearchOutlined from '@mui/icons-material/SearchOutlined'
import {
  Box,
  IconButton,
  InputAdornment,
  OutlinedInput
} from '@mui/material'
import {
  useEffect,
  useRef,
  useState,
  type DragEventHandler,
  type KeyboardEvent as ReactKeyboardEvent,
  type MutableRefObject,
  type MouseEvent as ReactMouseEvent,
  type ReactNode
} from 'react'
import type { SxProps, Theme } from '@mui/material/styles'
import {
  createAssetTreeSearchActions,
  type AssetTreeToolbarAction
} from './scripted-asset-workspace/search-actions.js'
import { sharedAssetTreeSx } from './scripted-asset-workspace/tree-styles.js'

export function ScriptedAssetWorkspace({
  detailPane,
  onRootContextMenu,
  onRootDragLeave,
  onRootDragOver,
  onRootDrop,
  onSearchChange,
  onSearchKeyDown,
  onTreeKeyDown,
  searchInputRef,
  searchPlaceholder,
  searchQuery,
  searchActions,
  storageKey,
  sx,
  treePane
}: {
  detailPane: ReactNode
  onRootContextMenu?: (event: ReactMouseEvent<HTMLDivElement>) => void
  onRootDragLeave?: DragEventHandler<HTMLDivElement>
  onRootDragOver?: DragEventHandler<HTMLDivElement>
  onRootDrop?: DragEventHandler<HTMLDivElement>
  onSearchChange: (value: string) => void
  onSearchKeyDown?: (event: ReactKeyboardEvent<HTMLInputElement>) => void
  onTreeKeyDown?: (event: ReactKeyboardEvent<HTMLDivElement>) => void
  searchInputRef?: MutableRefObject<HTMLInputElement | null>
  searchPlaceholder: string
  searchQuery: string
  searchActions?: AssetTreeToolbarAction[]
  storageKey: string
  sx?: SxProps<Theme>
  treePane: ReactNode
}) {
  const [treeWidth, setTreeWidth] = useState(272)
  const [isResizingTree, setIsResizingTree] = useState(false)
  const layoutRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const savedWidth = Number(globalThis.localStorage?.getItem(storageKey))

    if (Number.isFinite(savedWidth) && savedWidth >= 180 && savedWidth <= 420) {
      setTreeWidth(savedWidth)
    }
  }, [storageKey])

  useEffect(() => {
    if (!isResizingTree) {
      return
    }

    function handlePointerMove(event: MouseEvent) {
      const rect = layoutRef.current?.getBoundingClientRect()

      if (!rect) {
        return
      }

      const nextWidth = Math.min(
        420,
        Math.max(180, Math.round(event.clientX - rect.left))
      )

      setTreeWidth(nextWidth)
    }

    function handlePointerUp() {
      setIsResizingTree(false)
    }

    const previousCursor = document.body.style.cursor
    const previousUserSelect = document.body.style.userSelect
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('mousemove', handlePointerMove)
    window.addEventListener('mouseup', handlePointerUp)

    return () => {
      document.body.style.cursor = previousCursor
      document.body.style.userSelect = previousUserSelect
      window.removeEventListener('mousemove', handlePointerMove)
      window.removeEventListener('mouseup', handlePointerUp)
    }
  }, [isResizingTree])

  useEffect(() => {
    globalThis.localStorage?.setItem(storageKey, String(treeWidth))
  }, [storageKey, treeWidth])

  return (
    <Box
      ref={layoutRef}
      sx={[
        {
          flex: 1,
          minHeight: 0,
          display: 'grid',
          gridTemplateColumns: `${treeWidth}px 2px minmax(0, 1fr)`,
          gridTemplateRows: 'minmax(0, 1fr)',
          alignItems: 'stretch'
        },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : [])
      ]}
    >
      <Box sx={{ minWidth: 0, minHeight: 0, overflow: 'hidden', display: 'flex' }}>
        <Box sx={{ height: '100%', minHeight: 0, flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ py: 0 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0
              }}
            >
              <OutlinedInput
                inputRef={searchInputRef}
                size="small"
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(event) => onSearchChange(event.target.value)}
                onKeyDown={onSearchKeyDown}
                startAdornment={
                  <InputAdornment position="start">
                    <SearchOutlined sx={{ fontSize: 16 }} color="action" />
                  </InputAdornment>
                }
                endAdornment={
                  searchQuery ? (
                    <InputAdornment position="end" sx={{ mr: -0.25 }}>
                      <IconButton
                        aria-label="clear"
                        size="small"
                        onClick={() => onSearchChange('')}
                        sx={{ width: 22, height: 22 }}
                      >
                        <CloseOutlined sx={{ fontSize: 14 }} />
                      </IconButton>
                    </InputAdornment>
                  ) : undefined
                }
                sx={{
                  flex: 1,
                  minHeight: 30,
                  borderRadius: 0,
                  '& .MuiInputBase-input': {
                    fontSize: 13
                  },
                  '& .MuiOutlinedInput-input, & .MuiInputBase-input': {
                    py: 0.5,
                    px: 0.25
                  },
                  '& .MuiInputAdornment-positionStart': {
                    mr: 0.5
                  },
                  '& .MuiInputAdornment-positionEnd .MuiSvgIcon-root': {
                    fontSize: 14
                  }
                }}
              />
              {searchActions?.map((action) => (
                <IconButton
                  key={action.key}
                  aria-label={action.label}
                  size="small"
                  onClick={action.onClick}
                  sx={{
                    width: 30,
                    height: 30,
                    p: 0,
                    flexShrink: 0,
                    borderRadius: 0,
                    '& .MuiSvgIcon-root': {
                      fontSize: 18
                    }
                  }}
                >
                  {action.icon}
                </IconButton>
              ))}
            </Box>
          </Box>

          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              overflowX: 'hidden'
            }}
            onContextMenu={onRootContextMenu}
            onDragLeave={onRootDragLeave}
            onDragOver={onRootDragOver}
            onDrop={onRootDrop}
            onKeyDownCapture={onTreeKeyDown}
          >
            {treePane}
          </Box>
        </Box>
      </Box>

      <Box
        aria-hidden
        onDoubleClick={() => setTreeWidth(272)}
        onMouseDown={(event) => {
          event.preventDefault()
          setIsResizingTree(true)
        }}
        sx={{
          cursor: 'col-resize',
          position: 'relative',
          overflow: 'visible',
          zIndex: 1,
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: '50%',
            width: 2,
            transform: 'translateX(-50%)',
            bgcolor: isResizingTree ? 'text.primary' : 'divider'
          },
          '&::after': {
            content: '""',
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: '50%',
            width: 8,
            transform: 'translateX(-50%)',
            bgcolor: 'text.primary',
            opacity: isResizingTree ? 0.18 : 0,
            transition: 'opacity 120ms ease'
          },
          '&:hover::after': {
            opacity: 0.14
          }
        }}
      />

      <Box
        sx={{
          minWidth: 0,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {detailPane}
      </Box>
    </Box>
  )
}
export {
  createAssetTreeSearchActions,
  sharedAssetTreeSx,
  type AssetTreeToolbarAction
}
