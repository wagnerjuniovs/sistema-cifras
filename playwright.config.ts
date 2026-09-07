import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 5173",
    url: "http://127.0.0.1:5173/",
    reuseExistingServer: true,
    timeout: 60_000,
  },
  use: {
    baseURL: "http://127.0.0.1:5173/",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      testIgnore: /iphone\.spec\.ts/,
      use: { browserName: "chromium" },
    },
    ...(["portrait", "landscape"] as const).map((orientation) => ({
      name: `iphone11-${orientation}`,
      testMatch: /iphone\.spec\.ts/,
      use: {
        ...devices["iPhone 11"],
        browserName: "webkit" as const,
        viewport: orientation === "portrait" ? { width: 414, height: 896 } : { width: 896, height: 414 },
        screen: orientation === "portrait" ? { width: 414, height: 896 } : { width: 896, height: 414 },
      },
    })),
  ],
});
