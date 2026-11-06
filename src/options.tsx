import { render } from "preact";
import { useEffect, useState } from "preact/hooks";
import { translate } from "./i18n";
import { readGlobalFreezeDefault, saveGlobalFreezeDefault } from "./table/freeze-rule-storage";
import type { FreezeOptions } from "./table/state";

function Settings() {
  const [values, setValues] = useState<FreezeOptions | null>(null);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    document.documentElement.lang = chrome.i18n.getUILanguage();
    document.title = translate("globalFreezeSettings");
    readGlobalFreezeDefault()
      .then(setValues)
      .catch(() => setStatus(translate("settingsLoadFailed")));
  }, []);
  return (
    <>
      <h1>{translate("globalFreezeSettings")}</h1>
      <p>{translate("globalFreezeDescription")}</p>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (!values || saving) return;
          setSaving(true);
          setStatus("");
          try {
            await saveGlobalFreezeDefault(values);
            setStatus(translate("saved"));
          } catch {
            setStatus(translate("failed"));
          } finally {
            setSaving(false);
          }
        }}
      >
        {(["rows", "columns"] as const).map((kind) => (
          <label key={kind}>
            {translate(kind === "rows" ? "frozenRows" : "frozenColumns")}
            <input
              type="number"
              min="0"
              max="5"
              step="1"
              required
              disabled={!values || saving}
              value={values?.[kind] ?? 0}
              onInput={(event) => {
                const value = event.currentTarget.valueAsNumber;
                if (values) setValues({ ...values, [kind]: value });
                setStatus("");
              }}
            />
          </label>
        ))}
        <button type="submit" disabled={!values || saving}>
          {translate(saving ? "saving" : "saveSettings")}
        </button>
        <span role="status">{status}</span>
      </form>
    </>
  );
}

const root = document.getElementById("settings");
if (root) render(<Settings />, root);
