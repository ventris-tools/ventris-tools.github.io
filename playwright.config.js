import { defineConfig } from "@playwright/test";

const port = 4175;

export default defineConfig({
  testDir: "test",
  // One browser. Several Chromes starting at once sometimes hang on macOS, and this takes seconds anyway.
  workers: 1,
  forbidOnly: !!process.env.CI,
  reporter: "list",
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    // The Chrome already on your computer or the GitHub runner, so there is no browser to download.
    channel: "chrome",
  },
  webServer: {
    command: `python3 -m http.server ${port} --bind 127.0.0.1 --directory site`,
    url: `http://127.0.0.1:${port}`,
    stderr: "ignore",
  },
});
