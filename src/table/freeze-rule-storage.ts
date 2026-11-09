import type { FreezeOptions } from "./state";

const FREEZE_RULE_SETTINGS_STORAGE_KEY = "githubTableEnhancerFreezeRuleSettings";
const HEADING_RULE_PREFIX = "githubTableEnhancerHeadingFreeze:";

function headingRuleKey(repository: string, heading: string): string {
  return HEADING_RULE_PREFIX + JSON.stringify([repository, heading]);
}

const GLOBAL_FREEZE_STORAGE_KEY = "githubTableEnhancerGlobalFreeze";

export type FreezeRuleSettings = {
  version: 2;
  repositoryRules: Record<string, Record<string, FreezeOptions>>;
};

function getStorageArea(): chrome.storage.StorageArea | null {
  return typeof chrome === "undefined" ? null : chrome.storage.local;
}

function isFreezeOptions(value: unknown): value is FreezeOptions {
  if (!value || typeof value !== "object") {
    return false;
  }

  const options = value as Partial<FreezeOptions>;

  return Number.isInteger(options.rows) && Number.isInteger(options.columns);
}

function normalizeSettings(value: unknown): FreezeRuleSettings {
  if (!value || typeof value !== "object") {
    return { version: 2, repositoryRules: {} };
  }

  const settings = value as Partial<FreezeRuleSettings>;
  const repositoryRules: Record<string, Record<string, FreezeOptions>> = {};

  if (
    settings.version === 2 &&
    settings.repositoryRules &&
    typeof settings.repositoryRules === "object"
  ) {
    for (const [repository, rules] of Object.entries(settings.repositoryRules)) {
      if (!rules || typeof rules !== "object") {
        continue;
      }

      const headingRules: Record<string, FreezeOptions> = {};

      for (const [headingText, options] of Object.entries(rules)) {
        if (isFreezeOptions(options)) {
          headingRules[headingText] = options;
        }
      }

      if (Object.keys(headingRules).length > 0) {
        repositoryRules[repository] = headingRules;
      }
    }
  }

  return { version: 2, repositoryRules };
}

async function readLegacyFreezeRuleSettings(): Promise<FreezeRuleSettings> {
  const storage = getStorageArea();

  if (!storage) {
    return { version: 2, repositoryRules: {} };
  }

  const items = await storage.get(FREEZE_RULE_SETTINGS_STORAGE_KEY);

  return normalizeSettings(items[FREEZE_RULE_SETTINGS_STORAGE_KEY]);
}

export async function readHeadingFreezeRule(
  repository: string,
  headingText: string,
): Promise<FreezeOptions | null> {
  const key = headingRuleKey(repository, headingText);
  const items = await getStorageArea()?.get(key);
  // A null override is a tombstone: never resurrect a removed legacy rule.
  if (items && items[key] !== undefined) {
    return isFreezeOptions(items[key]) ? items[key] : null;
  }
  const settings = await readLegacyFreezeRuleSettings();
  return settings.repositoryRules[repository]?.[headingText] ?? null;
}

export async function saveHeadingFreezeRule(
  repository: string,
  headingText: string,
  options: FreezeOptions,
): Promise<void> {
  const storage = getStorageArea();

  if (!storage) {
    return;
  }

  // Independent keys prevent concurrent writes in other tabs from losing rules.
  await storage.set({ [headingRuleKey(repository, headingText)]: options });
}

export async function readGlobalFreezeDefault(): Promise<FreezeOptions> {
  const items = await getStorageArea()?.get(GLOBAL_FREEZE_STORAGE_KEY);
  const value: unknown = items?.[GLOBAL_FREEZE_STORAGE_KEY];
  return isFreezeOptions(value) &&
    value.rows >= 0 &&
    value.rows <= 5 &&
    value.columns >= 0 &&
    value.columns <= 5
    ? value
    : { rows: 0, columns: 0 };
}

export async function saveGlobalFreezeDefault(value: FreezeOptions): Promise<void> {
  if (
    !isFreezeOptions(value) ||
    value.rows < 0 ||
    value.rows > 5 ||
    value.columns < 0 ||
    value.columns > 5
  ) {
    throw new Error("Invalid global freeze values");
  }
  const storage = getStorageArea();
  if (!storage) throw new Error("Storage unavailable");
  await storage.set({ [GLOBAL_FREEZE_STORAGE_KEY]: value });
}

export async function readEffectiveFreezeDefault(
  repository: string | null,
  heading: string | null,
): Promise<FreezeOptions> {
  const rule = repository && heading ? await readHeadingFreezeRule(repository, heading) : null;
  return rule ?? readGlobalFreezeDefault();
}

export async function removeHeadingFreezeRule(
  repository: string,
  heading: string,
): Promise<FreezeOptions> {
  const storage = getStorageArea();
  if (!storage) throw new Error("Storage unavailable");
  const globalDefault = await readGlobalFreezeDefault();
  await storage.set({ [headingRuleKey(repository, heading)]: null });
  return globalDefault;
}
