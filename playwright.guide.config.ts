import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "user-guide-screenshots.spec.ts",
  fullyParallel: false,
  forbidOnly: true,
  reporter: "list",
  timeout: 90_000,
  workers: 1,
});
