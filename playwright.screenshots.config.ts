import { defineConfig, devices } from "@playwright/test";
import { AUTH_EMULATOR_HOST, E2E_PROJECT_ID } from "./e2e/global-setup";

/**
 * ヘルプ用スクリーンショット生成専用Playwright設定
 */
export default defineConfig({
  testDir: "./e2e",
  testMatch: ["**/generate-help-screenshots.ts"],
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:5173",
    trace: "off",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  globalSetup: "./e2e/global-setup.ts",
  webServer: {
    command: "npm run dev",
    cwd: "./frontend",
    url: "http://localhost:5173",
    reuseExistingServer: true,
    env: {
      VITE_FIREBASE_API_KEY: "fake-api-key",
      VITE_FIREBASE_AUTH_DOMAIN: "localhost",
      VITE_FIREBASE_PROJECT_ID: E2E_PROJECT_ID,
      VITE_FIREBASE_AUTH_EMULATOR_HOST: AUTH_EMULATOR_HOST,
      VITE_API_URL: "",
    },
  },
});
