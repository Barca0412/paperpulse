import { useEffect, useState } from "react";
import {
  getKeywords,
  saveKeywords,
  getSeeds,
  saveSeeds,
  getTopics,
  saveTopics,
  getTiers,
  saveTiers,
  type KeywordsPayload,
  type SeedsPayload,
  type TopicsPayload,
  type TiersPayload,
} from "@/lib/settings";

export type SettingsState<T> =
  | { kind: "loading" }
  | { kind: "ok"; data: T }
  | { kind: "error"; message: string };

function createHook<T>(load: () => Promise<T>, store: (v: T) => Promise<T>) {
  return function useResource() {
    const [state, setState] = useState<SettingsState<T>>({ kind: "loading" });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
      let cancelled = false;
      load()
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

    async function save(next: T) {
      setSaving(true);
      try {
        const fresh = await store(next);
        setState({ kind: "ok", data: fresh });
      } catch (e) {
        setState({ kind: "error", message: String(e) });
      } finally {
        setSaving(false);
      }
    }

    return { state, save, saving };
  };
}

export const useKeywords = createHook<KeywordsPayload>(getKeywords, saveKeywords);
export const useSeeds = createHook<SeedsPayload>(getSeeds, saveSeeds);
export const useTopics = createHook<TopicsPayload>(getTopics, saveTopics);
export const useTiers = createHook<TiersPayload>(getTiers, saveTiers);
