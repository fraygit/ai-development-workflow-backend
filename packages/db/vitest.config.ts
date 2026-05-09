import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    globalSetup: './test/globalSetup.ts',
    env: {
      DATABASE_URL: 'postgresql://aidevflow:aidevflow@localhost:5432/aidevflow_test'
    }
  }
})
