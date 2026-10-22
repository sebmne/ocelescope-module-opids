import { Page } from "../components";
import OpidEditor from "../features/editor/OpidEditor";

// Build an OPID and keep it as a resource, to align logs with on the alignments page.
export default function OpidsPage() {
  return (
    <Page title="OPIDs">
      <OpidEditor />
    </Page>
  );
}
