import type { FreezeOptions } from "./state";

const FREEZE_RULE_SETTINGS_STORAGE_KEY = "githubTableEnhancerFreezeRuleSettings";
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

export async function readFreezeRuleSettings(): Promise<FreezeRuleSettings> {
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
  const settings = await readFreezeRuleSettings();

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

  const settings = await readFreezeRuleSettings();

  await storage.set({
    [FREEZE_RULE_SETTINGS_STORAGE_KEY]: {
      version: 2,
      repositoryRules: {
        ...settings.repositoryRules,
        [repository]: {
          ...settings.repositoryRules[repository],
          [headingText]: options,
        },
      },
    },
  });
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
  const [settings, globalDefault] = await Promise.all([
    readFreezeRuleSettings(),
    readGlobalFreezeDefault(),
  ]);
  delete settings.repositoryRules[repository]?.[heading];
  if (Object.keys(settings.repositoryRules[repository] ?? {}).length === 0) {
    delete settings.repositoryRules[repository];
  }
  await storage.set({ [FREEZE_RULE_SETTINGS_STORAGE_KEY]: settings });
  return globalDefault;
}
