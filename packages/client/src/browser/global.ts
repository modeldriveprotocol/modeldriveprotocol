import { createClientFromScriptTag } from './browser-entry.js'
import { MdpClient, createMdpClient, resolveServerUrl } from './api.js'

const api = {
  MdpClient,
  createMdpClient,
  createClientFromScriptTag,
  resolveServerUrl
}

const globalScope = globalThis as typeof globalThis & {
  MDP?: typeof api
}

globalScope.MDP = api

export default api
export { MdpClient, createClientFromScriptTag, createMdpClient, resolveServerUrl }
