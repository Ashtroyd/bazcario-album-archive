export type ExtensionConfig = {
  siteUrl: string;
  token: string;
};

const STORAGE_KEY = "album-archive:connection";
export const DEFAULT_SITE_URL = "https://bazcario-album-archive.vercel.app";

export function loadConfig(): ExtensionConfig | null {
  const raw = Spicetify.LocalStorage.get(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ExtensionConfig;
    if (!parsed.siteUrl || !parsed.token) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveConfig(config: ExtensionConfig): void {
  Spicetify.LocalStorage.set(STORAGE_KEY, JSON.stringify(config));
}

export function clearConfig(): void {
  Spicetify.LocalStorage.set(STORAGE_KEY, "");
}
