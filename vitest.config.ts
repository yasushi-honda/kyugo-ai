import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: ["node_modules", "dist", "frontend/**", "firestore/**", "e2e/**"],
  },
});
