import { useGetOcels } from "@ocelescope/api-base";
import { useCurrentOcel } from "@ocelescope/core";

/** The session's logs, and the one selected in Ocelescope. */
export function useLogs() {
  const { data: logs = [] } = useGetOcels();
  const { id: currentId } = useCurrentOcel();
  return { logs, currentId };
}
