import { defineConfig } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:4173";
const useExternalWebServer = process.env.E2E_EXTERNAL_WEB_SERVER === "true";

export default defineConfig({
  expect: {
    timeout: 10_000
  },
  forbidOnly: true,
  fullyParallel: false,
  outputDir: "test-results",
  reporter: [["line"]],
  retries: 0,
  testDir: "./tests/e2e",
  testMatch: "**/*.e2e.ts",
  timeout: 240_000,
  use: {
    actionTimeout: 15_000,
    baseURL,
    screenshot: "only-on-failure",
    trace: "off",
    video: "off"
  },
  ...(useExternalWebServer ? {} : {
    webServer: {
      command: "npm run dev -- --host 127.0.0.1 --port 4173 --strictPort",
      reuseExistingServer: false,
      stderr: "pipe" as const,
      stdout: "pipe" as const,
      timeout: 60_000,
      url: baseURL
    }
  }),
  workers: 1
});
