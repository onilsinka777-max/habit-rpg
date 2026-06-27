import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  timeout: 30_000,
  reporter: [["html", { open: "never" }], ["list"]],
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "on-first-retry",
    viewport: { width: 390, height: 844 },
    actionTimeout: 10_000,
  },
  projects: [{ name: "mobile-chrome", use: { ...devices["Pixel 7"] } }],
  webServer: [
    {
      command: "cd ../backend && node src/server.js",
      url: "http://localhost:3001/health",
      reuseExistingServer: !process.env.CI,
      timeout: 15_000,
    },
    {
      command: "cd ../frontend && npm run dev",
      url: "http://localhost:5173",
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
  ],
});
