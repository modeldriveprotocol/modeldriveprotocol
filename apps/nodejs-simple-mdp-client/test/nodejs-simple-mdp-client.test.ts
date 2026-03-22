import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import {
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

    expect(Object.keys(client.tools)).toEqual([
      'nodejs.getRuntimeInfo',
      'workspace.listSubpackages',
      'workspace.readPackageManifest',
      'workspace.updatePackageManifest'
    ])
    expect(Object.keys(client.skills)).toEqual([
      'nodejs-simple/overview',
      'nodejs-simple/tools',
      'nodejs-simple/package-json'
    ])

    await expect(client.skills['nodejs-simple/overview']?.()).resolves.toContain(
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
  const tools: Record<string, (args?: Record<string, unknown>) => unknown | Promise<unknown>> = {}
  const skills: Record<string, (() => Promise<string>) | undefined> = {}

  return {
    tools,
    skills,
    exposeTool(name: string, handler: (args?: Record<string, unknown>) => unknown | Promise<unknown>) {
      tools[name] = handler
      return this
    },
    exposeSkill(name: string, definition: string | (() => Promise<string>)) {
      if (typeof definition === 'string') {
        skills[name] = async () => definition
      }
      else {
        skills[name] = definition
      }
      return this
    },
    async connect() {},
    register() {}
  }
}
