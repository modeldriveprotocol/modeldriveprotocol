import { SidepanelView } from './sidepanel-view.js'
import { PopupView } from './popup-view.js'
import type { PopupSurface } from './types.js'
import { usePopupController } from './use-popup-controller.js'

export function PopupApp({ surface = 'popup' }: { surface?: PopupSurface }) {
  const controller = usePopupController(surface)
  return surface === 'sidepanel' ? <SidepanelView controller={controller} /> : <PopupView controller={controller} />
}
