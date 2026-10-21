import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "demo-video.spec.ts",
  fullyParallel: false,
  forbidOnly: true,
  reporter: "list",
  timeout: 180_000,
  workers: 1,
});
