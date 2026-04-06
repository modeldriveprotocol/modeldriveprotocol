import { useEffect, useRef, useState, type FocusEvent } from 'react'

const DEFAULT_SHOW_DELAY_MS = 240
const DEFAULT_HIDE_DELAY_MS = 90

export function useDelayedHoverActions(options?: {
  forcedVisible?: boolean
  showDelayMs?: number
  hideDelayMs?: number
}) {
  const [pointerInside, setPointerInside] = useState(false)
  const [focusWithin, setFocusWithin] = useState(false)
  const [showActionControls, setShowActionControls] = useState(false)
  const visibilityTimerRef = useRef<number | null>(null)
  const forcedVisible = options?.forcedVisible ?? false
  const showDelayMs = options?.showDelayMs ?? DEFAULT_SHOW_DELAY_MS
  const hideDelayMs = options?.hideDelayMs ?? DEFAULT_HIDE_DELAY_MS
  const shouldShowActions = forcedVisible || pointerInside || focusWithin

  useEffect(() => {
    if (visibilityTimerRef.current !== null) {
      window.clearTimeout(visibilityTimerRef.current)
    }

    visibilityTimerRef.current = window.setTimeout(() => {
      setShowActionControls(shouldShowActions)
      visibilityTimerRef.current = null
    }, shouldShowActions ? showDelayMs : hideDelayMs)

    return () => {
      if (visibilityTimerRef.current !== null) {
        window.clearTimeout(visibilityTimerRef.current)
        visibilityTimerRef.current = null
      }
    }
  }, [hideDelayMs, shouldShowActions, showDelayMs])

  function handleBlur(event: FocusEvent<HTMLElement>) {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
      return
    }

    setFocusWithin(false)
  }

  return {
    actionControlsVisible: forcedVisible || showActionControls,
    bind: {
      onBlur: handleBlur,
      onFocus: () => setFocusWithin(true),
      onMouseEnter: () => setPointerInside(true),
      onMouseLeave: () => setPointerInside(false)
    }
  }
}
