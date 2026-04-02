import type { MdpClient } from '@modeldriveprotocol/client'

import { registerCapabilityResources } from './resources.js'
import { registerReviewCapabilities } from './review.js'
import type { CapabilityEnvironment } from './types.js'
import { registerWorkspaceTools } from './workspace-tools.js'

export type { CapabilityEnvironment } from './types.js'

export function registerCapabilities(
  client: MdpClient,
  environment: CapabilityEnvironment
): void {
  registerWorkspaceTools(client, environment)
  registerReviewCapabilities(client, environment)
  registerCapabilityResources(client, environment)

  environment.log(
    'Registered VSCode paths: 6 POST endpoints, 3 GET endpoints, 1 prompt, and 1 skill.'
  )
}
