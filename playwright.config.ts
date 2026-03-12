import { defineConfig, devices } from "@playwright/test";
import { AUTH_EMULATOR_HOST, E2E_PROJECT_ID } from "./e2e/global-setup";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "html",
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
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
    reuseExistingServer: !process.env.CI,
    env: {
      VITE_FIREBASE_API_KEY: "fake-api-key",
      VITE_FIREBASE_AUTH_DOMAIN: "localhost",
      VITE_FIREBASE_PROJECT_ID: E2E_PROJECT_ID,
      VITE_FIREBASE_AUTH_EMULATOR_HOST: AUTH_EMULATOR_HOST,
      VITE_API_URL: "",
    },
  },
});
