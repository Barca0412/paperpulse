import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Institution } from "@/lib/types";

type State =
  | { kind: "loading" }
  | { kind: "ok"; data: Institution[] }
  | { kind: "error"; message: string };

export function useInstitutions(windowDays = 30, limit = 50) {
  const [state, setState] = useState<State>({ kind: "loading" });
  useEffect(() => {
    let cancelled = false;
    setState({ kind: "loading" });
    api
      .getInstitutions(windowDays, limit)
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
