import type { FreezeOptions } from "./table-freeze";

const FREEZE_RULE_SETTINGS_STORAGE_KEY = "githubTableEnhancerFreezeRuleSettings";

export type FreezeRuleSettings = {
  version: 1;
  headingRules: Record<string, FreezeOptions>;
};

type ChromeStorageArea = {
  get(keys?: string | string[] | Record<string, unknown>): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
};

type ChromeGlobal = typeof globalThis & {
  chrome?: {
    storage?: {
      local?: ChromeStorageArea;
    };
  };
};

function getStorageArea(): ChromeStorageArea | null {
  return (globalThis as ChromeGlobal).chrome?.storage?.local ?? null;
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
    return { version: 1, headingRules: {} };
  }

  const settings = value as Partial<FreezeRuleSettings>;
  const headingRules: Record<string, FreezeOptions> = {};

  if (settings.headingRules && typeof settings.headingRules === "object") {
    for (const [headingText, options] of Object.entries(settings.headingRules)) {
      if (isFreezeOptions(options)) {
        headingRules[headingText] = options;
      }
    }
  }

  return { version: 1, headingRules };
}

export async function readFreezeRuleSettings(): Promise<FreezeRuleSettings> {
  const storage = getStorageArea();

  if (!storage) {
    return { version: 1, headingRules: {} };
  }

  const items = await storage.get(FREEZE_RULE_SETTINGS_STORAGE_KEY);

  return normalizeSettings(items[FREEZE_RULE_SETTINGS_STORAGE_KEY]);
}

export async function readHeadingFreezeRule(headingText: string): Promise<FreezeOptions | null> {
  const settings = await readFreezeRuleSettings();

  return settings.headingRules[headingText] ?? null;
}

export async function saveHeadingFreezeRule(
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
      version: 1,
      headingRules: {
        ...settings.headingRules,
        [headingText]: options,
      },
    },
  });
}
