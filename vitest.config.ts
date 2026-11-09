import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts', 'tests/integrations/**/*.test.ts'],
    passWithNoTests: true,
  },
});
