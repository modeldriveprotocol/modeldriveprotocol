import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it, vi } from 'vitest'

import type { ClientToServerMessage, ServerToClientMessage } from '@modeldriveprotocol/protocol'
import type { ClientTransport } from '@modeldriveprotocol/client'

import {
  bootNodejsSimpleMdpClient,
  getNodejsRuntimeInfo,
  listWorkspaceSubpackages,
  readWorkspacePackageManifest,
  registerNodejsSimpleCapabilities,
  updateWorkspacePackageManifest
} from '#~/index.js'

describe('nodejs simple mdp client', () => {
  const tempDirectories: string[] = []

  afterEach(async () => {
    tempDirectories.length = 0
  })

  it('registers the built-in tools and file-backed skills', async () => {
    const client = createFakeClient()

    registerNodejsSimpleCapabilities(client)

    expect(Object.keys(client.endpoints)).toEqual([
      '/nodejs/runtime-info',
      '/workspace/subpackages',
      '/workspace/package-manifest',
      '/workspace/update-package-manifest'
    ])
    expect(Object.keys(client.skills)).toEqual([
      '/nodejs-simple/overview/skill.md',
      '/nodejs-simple/tools/skill.md',
      '/nodejs-simple/package-json/skill.md'
    ])

    await expect(client.skills['/nodejs-simple/overview/skill.md']?.()).resolves.toContain(
      '# Node.js Simple Client'
    )
  })

  it('reads runtime info from the workspace root package', async () => {
    const workspaceRoot = await createWorkspaceFixture()

    const info = await getNodejsRuntimeInfo(workspaceRoot)

    expect(info.workspaceRoot).toBe(workspaceRoot)
    expect(info.rootPackage).toMatchObject({
      name: 'mdp-fixture',
      version: '1.0.0',
      description: 'Fixture workspace',
      private: true,
      packageManager: 'pnpm@10.28.0'
    })
    expect(info.dependencySummary).toEqual({
      dependencies: 1,
      devDependencies: 1,
      peerDependencies: 0,
      optionalDependencies: 0
    })
  })

  it('lists subpackages from the current workspace', async () => {
    const workspaceRoot = await createWorkspaceFixture()

    await expect(listWorkspaceSubpackages(workspaceRoot)).resolves.toEqual([
      {
        name: '@fixture/browser-client',
        version: '0.1.0',
        description: 'Browser fixture app',
        private: false,
        relativeDir: 'apps/browser-client',
        manifestPath: path.join(workspaceRoot, 'apps/browser-client/package.json')
      },
      {
        name: '@fixture/client',
        version: '0.1.0',
        description: 'Client fixture package',
        private: false,
        relativeDir: 'packages/client',
        manifestPath: path.join(workspaceRoot, 'packages/client/package.json')
      }
    ])
  })

  it('reads one package manifest relative to the workspace root', async () => {
    const workspaceRoot = await createWorkspaceFixture()

    await expect(
      readWorkspacePackageManifest(workspaceRoot, {
        packageDir: 'packages/client'
      })
    ).resolves.toMatchObject({
      workspaceRoot,
      packageDir: 'packages/client',
      manifestPath: path.join(workspaceRoot, 'packages/client/package.json'),
      manifest: {
        name: '@fixture/client',
        version: '0.1.0',
        description: 'Client fixture package'
      }
    })
  })

  it('updates package metadata and dependency sections', async () => {
    const workspaceRoot = await createWorkspaceFixture()

    const result = await updateWorkspacePackageManifest(workspaceRoot, {
      packageDir: 'packages/client',
      name: '@fixture/client-next',
      description: 'Updated fixture client',
      dependencies: {
        alpha: '^1.2.0',
        zod: '^3.25.0'
      },
      devDependencies: {
        vitest: '^3.2.4'
      },
      removeDependencies: ['dep-a'],
      removeDevDependencies: ['typescript']
    })

    expect(result.packageDir).toBe('packages/client')
    expect(result.manifest).toMatchObject({
      name: '@fixture/client-next',
      description: 'Updated fixture client',
      dependencies: {
        alpha: '^1.2.0',
        zod: '^3.25.0'
      },
      devDependencies: {
        vitest: '^3.2.4'
      }
    })
    expect(result.changes).toEqual({
      nameChanged: true,
      descriptionChanged: true,
      dependenciesAdded: ['alpha', 'zod'],
      dependenciesUpdated: [],
      dependenciesRemoved: ['dep-a'],
      devDependenciesAdded: ['vitest'],
      devDependenciesUpdated: [],
      devDependenciesRemoved: ['typescript'],
      peerDependenciesAdded: [],
      peerDependenciesUpdated: [],
      peerDependenciesRemoved: [],
      optionalDependenciesAdded: [],
      optionalDependenciesUpdated: [],
      optionalDependenciesRemoved: []
    })

    const persistedManifest = JSON.parse(
      await readFile(path.join(workspaceRoot, 'packages/client/package.json'), 'utf8')
    ) as Record<string, unknown>

    expect(persistedManifest).toMatchObject({
      name: '@fixture/client-next',
      description: 'Updated fixture client',
      dependencies: {
        alpha: '^1.2.0',
        zod: '^3.25.0'
      },
      devDependencies: {
        vitest: '^3.2.4'
      }
    })
  })

  it('enables reconnect by default when booting the node client', async () => {
    vi.useFakeTimers()

    try {
      const transport = new FakeTestTransport()
      const client = await bootNodejsSimpleMdpClient({
        transport
      })

      transport.emitClose()
      await vi.advanceTimersByTimeAsync(1_000)

      await vi.waitFor(() => {
        expect(transport.connectCalls).toBe(2)
        expect(
          transport.sent.filter((message) => message.type === 'registerClient')
        ).toHaveLength(2)
      })

      await client.disconnect()
    } finally {
      vi.useRealTimers()
    }
  })

  async function createWorkspaceFixture(): Promise<string> {
    const workspaceRoot = await mkdtemp(path.join(tmpdir(), 'mdp-nodejs-simple-'))
    tempDirectories.push(workspaceRoot)

    await writeFile(
      path.join(workspaceRoot, 'pnpm-workspace.yaml'),
      ['packages:', '  - packages/*', '  - apps/*', ''].join('\n'),
      'utf8'
    )
    await writeFile(
      path.join(workspaceRoot, 'package.json'),
      JSON.stringify({
        name: 'mdp-fixture',
        version: '1.0.0',
        description: 'Fixture workspace',
        private: true,
        packageManager: 'pnpm@10.28.0',
        dependencies: {
          zod: '^3.25.0'
        },
        devDependencies: {
          vitest: '^3.2.4'
        }
      }, null, 2) + '\n',
      'utf8'
    )

    await mkdir(path.join(workspaceRoot, 'packages/client'), { recursive: true })
    await writeFile(
      path.join(workspaceRoot, 'packages/client/package.json'),
      JSON.stringify({
        name: '@fixture/client',
        version: '0.1.0',
        description: 'Client fixture package',
        dependencies: {
          'dep-a': '^1.0.0'
        },
        devDependencies: {
          typescript: '^5.9.3'
        }
      }, null, 2) + '\n',
      'utf8'
    )

    await mkdir(path.join(workspaceRoot, 'apps/browser-client'), { recursive: true })
    await writeFile(
      path.join(workspaceRoot, 'apps/browser-client/package.json'),
      JSON.stringify({
        name: '@fixture/browser-client',
        version: '0.1.0',
        description: 'Browser fixture app'
      }, null, 2) + '\n',
      'utf8'
    )

    return workspaceRoot
  }
})

function createFakeClient() {
  const endpoints: Record<string, (request: {
    params: Record<string, unknown>
    queries: Record<string, unknown>
    headers: Record<string, string>
    body?: unknown
  }) => unknown | Promise<unknown>> = {}
  const skills: Record<string, (() => Promise<string>) | undefined> = {}

  return {
    endpoints,
    skills,
    expose(path: string, definition: string | { method?: string }, handler?: (...args: any[]) => unknown | Promise<unknown>) {
      if (path.endsWith('/skill.md')) {
        if (typeof definition === 'string') {
          skills[path] = async () => definition
        }
        else if (handler) {
          skills[path] = async () => String(await handler())
        }
        else {
          throw new Error(`Expected skill handler for ${path}`)
        }

        return this
      }

      if (typeof definition === 'string' || !handler) {
        throw new Error(`Expected endpoint descriptor and handler for ${path}`)
      }

      endpoints[path] = handler as (request: {
        params: Record<string, unknown>
        queries: Record<string, unknown>
        headers: Record<string, string>
        body?: unknown
      }) => unknown | Promise<unknown>
      return this
    },
    async connect() {},
    register() {}
  }
}

class FakeTestTransport implements ClientTransport {
  readonly sent: ClientToServerMessage[] = []
  connectCalls = 0

  private messageHandler?: (message: ServerToClientMessage) => void
  private closeHandler?: () => void

  async connect(): Promise<void> {
    this.connectCalls += 1
  }

  send(message: ClientToServerMessage): void {
    this.sent.push(message)
  }

  async close(): Promise<void> {}

  onMessage(handler: (message: ServerToClientMessage) => void): void {
    this.messageHandler = handler
  }

  onClose(handler: () => void): void {
    this.closeHandler = handler
  }

  emitClose(): void {
    this.closeHandler?.()
  }
}
