import {
  cloneRouteExposeAssets,
  createBackgroundClientConfig,
  createRouteClientConfig,
  type BackgroundClientConfig,
  type RouteClientConfig
} from '#~/shared/config.js'

export function forkEditableClient(
  item: {
    kind: 'background'
    id: string
    client: BackgroundClientConfig
  },
  t: (key: string, values?: Record<string, string | number>) => string
): BackgroundClientConfig
export function forkEditableClient(
  item: {
    kind: 'route'
    id: string
    client: RouteClientConfig
  },
  t: (key: string, values?: Record<string, string | number>) => string
): RouteClientConfig
export function forkEditableClient(
  item:
    | {
        kind: 'background'
        id: string
        client: BackgroundClientConfig
      }
    | {
        kind: 'route'
        id: string
        client: RouteClientConfig
      },
  t: (key: string, values?: Record<string, string | number>) => string
) {
  const nextName = `${item.client.clientName} ${t(
    'options.clients.copySuffix'
  )}`

  if (item.kind === 'background') {
    const {
      id: _id,
      clientId: _clientId,
      createdAt: _createdAt,
      ...backgroundRest
    } = item.client

    return createBackgroundClientConfig({
      ...backgroundRest,
      clientName: nextName,
      favorite: false,
      pinned: false,
      exposes: item.client.exposes.map((asset) => ({ ...asset })),
      disabledExposePaths: [...item.client.disabledExposePaths]
    })
  }

  const {
    id: _id,
    clientId: _clientId,
    createdAt: _createdAt,
    installSource: _installSource,
    ...routeRest
  } = item.client

  return createRouteClientConfig({
    ...routeRest,
    clientName: nextName,
    favorite: false,
    pinned: false,
    routeRules: item.client.routeRules.map((rule) => ({ ...rule })),
    exposes: cloneRouteExposeAssets(item.client.exposes)
  })
}
