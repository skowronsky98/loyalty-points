import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    name: 'unit',
    include: ['./src/**/*.unit.test.ts'],
  },
})
