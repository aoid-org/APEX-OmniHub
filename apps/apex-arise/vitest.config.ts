import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/types.ts"],
      reporter: ["text", "lcov"],
      // Output relative to the apps/apex-arise directory so root-level sonar
      // can find it at apps/apex-arise/coverage/lcov.info
      reportsDirectory: "./coverage",
    },
  },
});
