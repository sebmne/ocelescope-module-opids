import { useMemo } from "react";
import { useGetOpid } from "../api/opidConformance";
import { colorScheme } from "../lib/colors";

/** An OPID with the colors of its places and object types; nothing while no id is given. */
export function useOpid(opidId: string | null | undefined, objectTypes: readonly string[] = []) {
  const query = useGetOpid(opidId ?? "", { query: { enabled: !!opidId } });
  const net = query.data;
  const typesKey = objectTypes.join();
  const colors = useMemo(
    () => colorScheme(net?.places.map((p) => p.color) ?? [], objectTypes),
    [net, typesKey],
  );
  return { query, net, colors };
}
