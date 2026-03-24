import { SidepanelView } from './sidepanel-view.js'
import { useSidepanelController } from './use-sidepanel-controller.js'

export function SidePanelApp() {
  const controller = useSidepanelController()
  return <SidepanelView controller={controller} />
}
