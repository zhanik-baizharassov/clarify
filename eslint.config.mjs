import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    linterOptions: {
      reportUnusedDisableDirectives: "error",
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // copied from node_modules by scripts/sync-maplibre-worker.mjs
    "public/vendor/**",
    // local agent worktrees (not part of the project)
    ".claude/**",
  ]),
]);

export default eslintConfig;