import CloseOutlined from '@mui/icons-material/CloseOutlined'
import SearchOutlined from '@mui/icons-material/SearchOutlined'
import {
  Box,
  IconButton,
  InputAdornment,
  TextField
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

export function ScriptedAssetWorkspace({
  detailPane,
  onRootContextMenu,
  onRootDragLeave,
  onRootDragOver,
  onRootDrop,
  onSearchChange,
  onSearchKeyDown,
  searchInputRef,
  searchPlaceholder,
  searchQuery,
  storageKey,
  treePane
}: {
  detailPane: ReactNode
  onRootContextMenu?: (event: ReactMouseEvent<HTMLDivElement>) => void
  onRootDragLeave?: DragEventHandler<HTMLDivElement>
  onRootDragOver?: DragEventHandler<HTMLDivElement>
  onRootDrop?: DragEventHandler<HTMLDivElement>
  onSearchChange: (value: string) => void
  onSearchKeyDown?: (event: ReactKeyboardEvent<HTMLInputElement>) => void
  searchInputRef?: MutableRefObject<HTMLInputElement | null>
  searchPlaceholder: string
  searchQuery: string
  storageKey: string
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
      sx={{
        flex: 1,
        minHeight: 0,
        display: 'grid',
        gridTemplateColumns: `${treeWidth}px 6px minmax(0, 1fr)`,
        gridTemplateRows: 'minmax(0, 1fr)',
        alignItems: 'stretch'
      }}
    >
      <Box sx={{ minWidth: 0, minHeight: 0, overflow: 'hidden', display: 'flex' }}>
        <Box sx={{ height: '100%', minHeight: 0, flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Box
            sx={{
              py: 0.5,
              borderBottom: '1px solid',
              borderColor: 'divider'
            }}
          >
            <TextField
              inputRef={searchInputRef}
              size="small"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              onKeyDown={onSearchKeyDown}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchOutlined fontSize="small" color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: searchQuery ? (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="clear"
                        size="small"
                        onClick={() => onSearchChange('')}
                      >
                        <CloseOutlined fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ) : undefined
                }
              }}
              sx={{
                width: '100%',
                '& .MuiOutlinedInput-root': {
                  minHeight: 34,
                  borderRadius: 1.5
                },
                '& .MuiOutlinedInput-input': {
                  py: 0.75
                }
              }}
            />
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
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: '50%',
            width: 1,
            transform: 'translateX(-50%)',
            bgcolor: isResizingTree ? 'text.primary' : 'divider'
          },
          '&:hover::before': {
            bgcolor: 'text.primary'
          }
        }}
      />

      <Box
        sx={{
          minWidth: 0,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {detailPane}
      </Box>
    </Box>
  )
}
