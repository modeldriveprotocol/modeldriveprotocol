import type { MdpClient } from '@modeldriveprotocol/client'

import type { BackgroundClientConfig } from '#~/shared/config.js'
import { registerScriptedBackgroundExpose } from './scripted-background-exposes.js'

export function registerBackgroundSkills(
  client: MdpClient,
  config: BackgroundClientConfig
): void {
  registerScriptedBackgroundExpose(
    client,
    null,
    config,
    'extension.skills.manage-clients',
    {
      contentType: 'text/markdown'
    }
  )
  registerScriptedBackgroundExpose(
    client,
    null,
    config,
    'extension.skills.manage-client-expose-rules',
    {
      contentType: 'text/markdown'
    }
  )
}
