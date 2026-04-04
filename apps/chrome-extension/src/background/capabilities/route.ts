import type {
  MdpClient
} from '@modeldriveprotocol/client'

import type { RouteClientConfig } from '#~/shared/config.js'
import {
  getRouteClientRecordings,
  getRouteClientSelectorResources,
  getRouteClientSkillEntries
} from '#~/shared/config.js'
import type { ChromeExtensionRuntimeApi } from '#~/background/runtime-api.js'
import {
  jsonResource,
  readRequestRecord,
  tabTargetSchema,
  toCanonicalPath,
  toCanonicalSkillPath
} from '#~/background/shared.js'
import { registerPageInjectedPaths } from './route/page-injected-paths.js'
import { registerPageInteractionTools } from './route/page-interaction-tools.js'
import { registerPageWaitTools } from './route/page-wait-tools.js'
import { renderRouteSkillContent } from './route/skills.js'
import { buildSelectorResourcePayload, slugify } from './route/shared.js'

export function registerRouteClientCapabilities(
  client: MdpClient,
  runtime: ChromeExtensionRuntimeApi,
  routeClient: RouteClientConfig
): void {
  client.expose(
    '/route/status',
    {
      method: 'GET',
      description:
        'Read the current route-scoped client configuration and recorded assets.'
    },
    async () => runtime.getRouteClient(routeClient.id),
  )

  registerPageInteractionTools(client, runtime, routeClient)
  registerPageInjectedPaths(client, runtime, routeClient)
  registerPageWaitTools(client, runtime, routeClient)

  for (const recording of getRouteClientRecordings(routeClient)) {
    const runnable =
      recording.mode === 'script'
        ? recording.scriptSource.trim().length > 0
        : recording.steps.length > 0

    if (!runnable) {
      continue
    }

    const method = recording.method ?? 'POST'

    client.expose(
      toCanonicalPath(recording.path || `flows/${slugify(recording.name)}`),
      {
        method,
        description: recording.description,
        ...(method !== 'GET' ? { inputSchema: tabTargetSchema() } : {})
      },
      async (request) =>
        runtime.runRouteRecording(routeClient.id, recording.id, readRequestRecord(request))
    )
  }

  client.expose(
    '/route/summary',
      {
        method: 'GET',
        description: 'Read a JSON resource snapshot of this route client.',
        contentType: 'application/json'
      },
    async () =>
      jsonResource({
        routeClient,
        recordings: await runtime.listRouteRecordings(routeClient.id),
        selectorResources: await runtime.listRouteSelectorResources(
          routeClient.id
        )
      }),
  )

  for (const resource of getRouteClientSelectorResources(routeClient)) {
    const method = resource.method ?? 'GET'

    client.expose(
      toCanonicalPath(resource.path || `selectors/${resource.id}`),
      {
        method,
        description: resource.description,
        contentType: 'application/json',
        ...(method !== 'GET' ? { inputSchema: tabTargetSchema() } : {})
      },
      async (request) => {
        if (resource.scriptSource?.trim()) {
          return runtime.runPageCommandForRouteClient(
            routeClient.id,
            request,
            {
              type: 'runMainWorld',
              action: 'runScript',
              args: {
                source: resource.scriptSource,
                scriptArgs: readRequestRecord(request)
              }
            }
          )
        }

        return jsonResource(buildSelectorResourcePayload(resource))
      },
    )
  }

  for (const skill of getRouteClientSkillEntries(routeClient)) {
    client.expose(
      toCanonicalSkillPath(skill.path),
      {
        description: skill.metadata.summary,
        contentType: 'text/markdown'
      },
      async (request) =>
        renderRouteSkillContent(skill, request.queries, request.headers),
    )
  }
}
