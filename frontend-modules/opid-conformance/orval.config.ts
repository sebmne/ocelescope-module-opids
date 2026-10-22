import { defineConfig } from "@ocelescope/api-config";

// `defineConfig` applies Ocelescope's shared Orval defaults (react-query over
// axios, input ./openapi.json, and the customFetch mutator in src/lib/fetcher.ts).
// You only provide the output target.
export default defineConfig({
  opidConformance: {
    output: { target: "./src/api/opidConformance.ts" },
  },
});
