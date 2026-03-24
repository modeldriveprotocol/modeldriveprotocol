import type { MdpClient } from '@modeldriveprotocol/client'

import type { RouteClientConfig } from '#~/shared/config.js'
import type { ChromeExtensionRuntimeApi } from '#~/background/runtime-api.js'
import { jsonResource, tabTargetSchema } from '#~/background/shared.js'
import { registerPageInjectedTools } from './page-injected-tools.js'
import { registerPageInteractionTools } from './page-interaction-tools.js'
import { registerPageWaitTools } from './page-wait-tools.js'
import { buildSelectorResourcePayload, slugify } from './shared.js'

export function registerRouteClientCapabilities(
  client: MdpClient,
  runtime: ChromeExtensionRuntimeApi,
  routeClient: RouteClientConfig
): void {
  client.exposeTool(
    'route.getStatus',
    async () => runtime.getRouteClient(routeClient.id),
    {
      description: 'Read the current route-scoped client configuration and recorded assets.'
    }
  )

  registerPageInteractionTools(client, runtime, routeClient)
  registerPageInjectedTools(client, runtime, routeClient)
  registerPageWaitTools(client, runtime, routeClient)

  for (const recording of routeClient.recordings) {
    client.exposeTool(
      `flow.${slugify(recording.name)}`,
      async (args) => runtime.runRouteRecording(routeClient.id, recording.id, args),
      {
        description: recording.description,
        inputSchema: tabTargetSchema()
      }
    )
  }

  client.exposeResource(
    `chrome-extension://route-client/${routeClient.id}/summary`,
    async () =>
      jsonResource({
        routeClient,
        recordings: await runtime.listRouteRecordings(routeClient.id),
        selectorResources: await runtime.listRouteSelectorResources(routeClient.id)
      }),
    {
      name: `${routeClient.clientName} Summary`,
      mimeType: 'application/json'
    }
  )

  for (const resource of routeClient.selectorResources) {
    client.exposeResource(
      `chrome-extension://route-client/${routeClient.id}/selector/${resource.id}`,
      async () => jsonResource(buildSelectorResourcePayload(resource)),
      {
        name: resource.name,
        description: resource.description,
        mimeType: 'application/json'
      }
    )
  }

  for (const skill of routeClient.skillEntries) {
    client.exposeSkill(skill.path, skill.content, {
      description: skill.summary,
      contentType: 'text/markdown'
    })
  }
}
