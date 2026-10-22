import type { OcelescopeConfig } from "@ocelescope/core";
import management from "@ocelescope/management";
import opidConformanceModule from "@instance/opid-conformance";

// `pnpm run add:frontend` adds local frontend modules here.
export default {
	modules: [management, opidConformanceModule],
} satisfies OcelescopeConfig;
