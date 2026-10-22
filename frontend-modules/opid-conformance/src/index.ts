import { defineModule, defineModuleRoute } from "@ocelescope/core";
import { GitCompareArrowsIcon } from "lucide-react";
import dynamic from "next/dynamic";

// Pages are built from r4pm and React Flow components, which reach for `document` as they are
// imported: they stay out of the server render.
const OpidsPage = dynamic(() => import("./pages/OpidsPage"), { ssr: false });
const AlignmentsPage = dynamic(() => import("./pages/AlignmentsPage"), { ssr: false });

// The module's table of contents: every page, and how it appears in the navigation. First build
// an OPID, then align logs with it.
export default defineModule({
  name: "opidConformance",
  label: "OPID Conformance",
  description: "Object-centric conformance alignments for OPIDs, computed with oCoCoMoT",
  authors: [{ name: "Menne, Sebastian" }],
  icon: GitCompareArrowsIcon,
  routes: [
    defineModuleRoute({ name: "opids", label: "OPIDs", component: OpidsPage }),
    defineModuleRoute({ name: "alignments", label: "Alignments", component: AlignmentsPage }),
  ],
});
