import { useEffect, useState } from "react";
import {
  getKeywords,
  saveKeywords,
  type KeywordsPayload,
} from "@/lib/settings";

export type SettingsState<T> =
  | { kind: "loading" }
  | { kind: "ok"; data: T }
  | { kind: "error"; message: string };

export function useKeywords() {
  const [state, setState] = useState<SettingsState<KeywordsPayload>>({
    kind: "loading",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getKeywords()
      .then((data) => {
        if (!cancelled) setState({ kind: "ok", data });
      })
      .catch((e) => {
        if (!cancelled) setState({ kind: "error", message: String(e) });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function save(next: KeywordsPayload) {
    setSaving(true);
    try {
      const fresh = await saveKeywords(next);
      setState({ kind: "ok", data: fresh });
    } catch (e) {
      setState({ kind: "error", message: String(e) });
    } finally {
      setSaving(false);
    }
  }

  return { state, save, saving };
}
