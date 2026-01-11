import { defineConfig } from "@trigger.dev/sdk";

export default defineConfig({
  // IMPORTANT: Replace with your actual project ref from https://cloud.trigger.dev
  // You'll get this when you create a project in the Trigger.dev dashboard
  project: "check-background-jobs",
  // Maximum task duration in seconds (5 minutes)
  maxDuration: 300,
  // Set default retry configuration
  retries: {
    enabledInDev: true,
    default: {
      maxAttempts: 4,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 30000,
      factor: 2,
    },
  },
  dirs: ["./trigger"],
});
