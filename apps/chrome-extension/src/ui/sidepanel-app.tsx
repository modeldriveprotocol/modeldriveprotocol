import { SidepanelView } from './sidepanel/sidepanel-view.js'
import { useSidepanelController } from './sidepanel/use-sidepanel-controller.js'

export function SidePanelApp() {
  const controller = useSidepanelController()
  return <SidepanelView controller={controller} />
}
