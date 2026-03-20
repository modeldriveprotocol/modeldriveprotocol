import { createClientFromScriptTag } from "./browser-entry.js";
import { MdpClient, createMdpClient, resolveServerUrl } from "./mdp-client.js";

const api = {
  MdpClient,
  createMdpClient,
  createClientFromScriptTag,
  resolveServerUrl
};

const globalScope = globalThis as typeof globalThis & {
  MDP?: typeof api;
};

globalScope.MDP = api;

export default api;
export { MdpClient, createClientFromScriptTag, createMdpClient, resolveServerUrl };
