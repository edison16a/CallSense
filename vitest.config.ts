import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  resolve: {
    // Mirrors the `@/*` path alias in tsconfig.json so tests import modules
    // by the same specifier the application does.
    alias: { '@': fileURLToPath(new URL('./', import.meta.url)) },
  },
  test: {
    // Node, not jsdom: every module under test is pure logic or a fetch
    // wrapper. The React components are thin enough that a DOM harness would
    // cost more than it catches.
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
})
