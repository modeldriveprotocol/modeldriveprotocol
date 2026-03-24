import { registerCommandListener } from './content-script/commands.js'
import { isContentScriptInstalled, markContentScriptInstalled } from './content-script/state.js'

export function installContentScript(): void {
  if (isContentScriptInstalled()) {
    return
  }

  markContentScriptInstalled()
  registerCommandListener()
}
