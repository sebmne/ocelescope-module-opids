import { useResources } from "@ocelescope/api-base";
import { useEffect, useRef } from "react";

/**
 * Calls back when the session's resources change, e.g. a Petri net was discovered or an OPID
 * renamed in Ocelescope: the host refreshes its own resource list, not the module's.
 */
export function useResourcesChanged(callback: () => void) {
  const resources = useResources().data;
  const version = resources?.map((r) => `${r.id}:${r.name}`).join() ?? null;
  const latest = useRef(callback);
  latest.current = callback;
  const seen = useRef(version);
  useEffect(() => {
    if (version === seen.current) return;
    seen.current = version;
    latest.current();
  }, [version]);
}
