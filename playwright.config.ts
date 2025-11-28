import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright設定ファイル
 * 顔検出のE2Eテスト用
 */
export default defineConfig({
  testDir: './tests/faceDetection/e2e',
  fullyParallel: false, // 順次実行（リソース節約のため）
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1, // 1つのワーカーで順次実行
  reporter: [
    ['html'],
    ['json', { outputFile: 'tests/faceDetection/benchmark-results/playwright-report.json' }],
    ['list'],
  ],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'bun run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000, // 2分
  },
})

