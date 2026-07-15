import { afterEach, describe, expect, it, vi } from "vitest";
import { translate } from "./i18n";

function installFakeChrome(value: unknown): void {
  Object.defineProperty(globalThis, "chrome", { configurable: true, value });
}

afterEach(() => {
  Reflect.deleteProperty(globalThis, "chrome");
});

describe("translate", () => {
  it("uses English fallback messages when Chrome i18n is unavailable", () => {
    expect(translate("hideColumn", [2])).toBe("Hide column 2");
  });

  it("uses Chrome localized messages when available", () => {
    const getMessage = vi.fn((key: string, substitutions?: string | string[]) => {
      if (key !== "hideColumn") return "";
      const [column] = Array.isArray(substitutions) ? substitutions : [substitutions];
      return `${column}列目を非表示`;
    });
    installFakeChrome({ i18n: { getMessage } });

    expect(translate("hideColumn", [2])).toBe("2列目を非表示");
    expect(getMessage).toHaveBeenCalledWith("hideColumn", ["2"]);
  });

  it("falls back to English when a localized key is missing", () => {
    installFakeChrome({ i18n: { getMessage: () => "" } });

    expect(translate("filterRows")).toBe("Filter rows");
  });

  it("falls back to English when Chrome rejects a message lookup", () => {
    installFakeChrome({
      i18n: {
        getMessage: () => {
          throw new Error("Invalid message lookup");
        },
      },
    });

    expect(translate("filterRows")).toBe("Filter rows");
  });
});
