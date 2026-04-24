import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { FeedResponse } from "@/lib/types";

type State =
  | { kind: "loading" }
  | { kind: "ok"; data: FeedResponse }
  | { kind: "error"; message: string };

export function useFeed(limit = 100) {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [tick, setTick] = useState(0);
  const reload = () => setTick((t) => t + 1);

  useEffect(() => {
    let cancelled = false;
    setState({ kind: "loading" });
    api
      .getFeed(limit)
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
  }, [limit, tick]);

  return { state, reload };
}
