import { resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export default {
  esbuild: {
    jsx: "automatic",
  },
  resolve: {
    alias: {
      // Path aliases matching tsconfig.base.json "paths" — used by test files
      // to import adapter modules via short names (e.g. @crossmark/index).
      // These must be specific enough to NOT intercept npm packages that share
      // the same scope (e.g. @gemwallet/api is an npm package, not a path alias).
      "@core/": resolve(__dirname, "packages/core/src") + "/",
      "@react/": resolve(__dirname, "packages/react/src") + "/",
      "@gemwallet/index": resolve(__dirname, "packages/adapters/gemwallet/src/index"),
      "@xaman/index": resolve(__dirname, "packages/adapters/xaman/src/index"),
      "@crossmark/index": resolve(__dirname, "packages/adapters/crossmark/src/index"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
  },
};
