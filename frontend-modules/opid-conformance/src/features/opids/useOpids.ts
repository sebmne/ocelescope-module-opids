import { useListOpids } from "../../api/opidConformance";
import { useResourcesChanged } from "../../hooks/useResourcesChanged";

/** The OPIDs among the session's resources, also when they change in Ocelescope. */
export function useOpids() {
  const list = useListOpids();
  useResourcesChanged(() => void list.refetch());
  return list;
}
