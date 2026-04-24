import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Author } from "@/lib/types";

type State =
  | { kind: "loading" }
  | { kind: "ok"; data: Author[] }
  | { kind: "error"; message: string };

export function useAuthors(windowDays = 30, limit = 100) {
  const [state, setState] = useState<State>({ kind: "loading" });
  useEffect(() => {
    let cancelled = false;
    setState({ kind: "loading" });
    api
      .getAuthors(windowDays, limit)
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
  }, [windowDays, limit]);
  return state;
}
