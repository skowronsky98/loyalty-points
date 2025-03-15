import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    name: 'integration',
    include: ['./src/**/*.integration.test.ts'],
    isolate: true,
    setupFiles: ['./src/test/setup-env-file.ts'],
    fileParallelism: false,
  },
})
