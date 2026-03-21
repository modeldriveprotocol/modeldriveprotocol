import {
  STORAGE_KEY,
  normalizeConfig,
  type ExtensionConfig
} from "./config.js";

export async function loadConfig(): Promise<ExtensionConfig> {
  const stored = (await chrome.storage.local.get(STORAGE_KEY)) as Record<string, unknown>;
  return normalizeConfig(stored[STORAGE_KEY]);
}

export async function saveConfig(
  config: ExtensionConfig
): Promise<ExtensionConfig> {
  const normalized = normalizeConfig(config);

  await chrome.storage.local.set({
    [STORAGE_KEY]: normalized
  });

  return normalized;
}

export async function patchConfig(
  patch: Partial<ExtensionConfig>
): Promise<ExtensionConfig> {
  const current = await loadConfig();
  return saveConfig({
    ...current,
    ...patch
  });
}
