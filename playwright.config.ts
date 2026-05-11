import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';
import { CSI_BASE_URL } from './config/csi';

dotenv.config({ path: path.resolve(__dirname, '.env') });


export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: CSI_BASE_URL,
    trace: 'on-first-retry',
    ignoreHTTPSErrors: true,
    headless: false
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // {
    //   name: 'mobile-chrome',
    //   testIgnore: 'visual/**',
    //   use: { ...devices['Pixel 7'] },
    // },
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    
    // {
    //   name: 'webkit',
    //   testIgnore: 'visual/**',
    //   use: { ...devices['Desktop Safari'] },
    // },
    // {
    //   name: 'vrt-chromium',
    //   testMatch: 'visual/**/*.spec.ts',
    //   use: {
    //     ...devices['Desktop Chrome'],
    //     viewport: { width: 1280, height: 720 },
    //     deviceScaleFactor: 1,
    //   },
    // },
  ],


});
