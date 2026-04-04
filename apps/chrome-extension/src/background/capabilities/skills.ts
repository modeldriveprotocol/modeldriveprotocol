import type { MdpClient } from '@modeldriveprotocol/client'

import {
  isBackgroundExposeEnabled,
  type BackgroundClientConfig
} from '#~/shared/config.js'

const MANAGE_CLIENTS_SKILL_PATH = '/extension/skills/manage-clients/skill.md'
const MANAGE_EXPOSE_RULES_SKILL_PATH =
  '/extension/skills/manage-client-expose-rules/skill.md'

export function registerBackgroundSkills(
  client: MdpClient,
  config: BackgroundClientConfig
): void {
  exposeBackgroundSkill(client, config, MANAGE_CLIENTS_SKILL_PATH, () => {
    client.expose(
      MANAGE_CLIENTS_SKILL_PATH,
      {
        description:
          'Guide for creating, updating, and deleting stored Chrome extension clients.',
        contentType: 'text/markdown'
      },
      async () => renderManageClientsSkill(),
    )
  })

  exposeBackgroundSkill(client, config, MANAGE_EXPOSE_RULES_SKILL_PATH, () => {
    client.expose(
      MANAGE_EXPOSE_RULES_SKILL_PATH,
      {
        description:
          'Guide for persisting route expose rules for a stored Chrome extension client.',
        contentType: 'text/markdown'
      },
      async () => renderManageExposeRulesSkill(),
    )
  })
}

function exposeBackgroundSkill(
  client: MdpClient,
  config: BackgroundClientConfig,
  path: string,
  register: () => void
): void {
  if (!isBackgroundExposeEnabled(config, path)) {
    return
  }

  register()
}

function renderManageClientsSkill(): string {
  return [
    '# Manage Chrome Workspace Clients',
    '',
    'Use this skill to inspect, create, update, or delete the Chrome extension clients stored in the workspace.',
    '',
    '## Recommended workflow',
    '',
    '1. Read `/extension/clients` to inspect the current `backgroundClients` and `routeClients` entries.',
    '2. Use `/extension/clients/create` to create a new `background` or `route` client.',
    '3. Use `/extension/clients/update` to change metadata, enablement, icons, built-in background exposes, route match patterns, or injected path scripts.',
    '4. Use `/extension/clients/delete` to remove a client when it is no longer needed.',
    '',
    '## Targeting rules',
    '',
    '- Prefer the internal `id` field from `/extension/clients` when mutating a specific client.',
    '- Pass `kind` together with `clientId` if the target would otherwise be ambiguous.',
    '- The built-in `background-client-workspace` client is required and cannot be deleted.',
    '',
    '## Notes',
    '',
    '- Mutations are persisted to extension storage.',
    '- Saved changes are applied to connected clients right after the write completes.'
  ].join('\n')
}

function renderManageExposeRulesSkill(): string {
  return [
    '# Add Stored Expose Rules To Route Clients',
    '',
    'Use this skill when you need to add and persist a new expose rule for a route client.',
    '',
    '## Recommended workflow',
    '',
    '1. Read `/extension/clients` and find the target route client.',
    '2. Call `/extension/clients/add-expose-rule` with the route client `id`, a `mode`, and a `value`.',
    '3. Re-read `/extension/clients` if you need to confirm the saved route rule list.',
    '',
    '## Supported modes',
    '',
    '- `pathname-prefix`',
    '- `pathname-exact`',
    '- `url-contains`',
    '- `regex`',
    '',
    '## Notes',
    '',
    '- This endpoint only works for `route` clients.',
    '- The response sets `duplicate: true` when the same `mode` and `value` already exist.',
    '- Stored expose rules are persisted and then applied to the live route client registration.'
  ].join('\n')
}
