import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { FeedQuery, FeedResponse } from "@/lib/types";

type State =
  | { kind: "loading" }
  | { kind: "ok"; data: FeedResponse }
  | { kind: "error"; message: string };

export function useFeed(query: FeedQuery = {}) {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [tick, setTick] = useState(0);
  const reload = () => setTick((t) => t + 1);

  const qKey = JSON.stringify(query);

  useEffect(() => {
    let cancelled = false;
    setState({ kind: "loading" });
    api
      .getFeed(query)
      .then((data) => {
        if (!cancelled) setState({ kind: "ok", data });
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setState({
            kind: "error",
            message: err instanceof Error ? err.message : String(err),
          });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qKey, tick]);

  return { state, reload };
}
