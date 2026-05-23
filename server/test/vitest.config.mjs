import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import swc from 'unplugin-swc';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

const serverRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export default defineConfig({
  test: {
    name: 'server:unit',
    root: serverRoot,
    globals: true,
    include: ['src/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/cores/**', 'src/services/**', 'src/utils/**', 'src/sql-tools/**', 'src/fork/**'],
      exclude: [
        'src/services/*.spec.ts',
        'src/services/api.service.ts',
        'src/services/microservices.service.ts',
        'src/services/index.ts',
        'src/fork/database.ts',
        'src/fork/fork-person.dto.ts',
        'src/fork/fork.module.ts',
        'src/fork/index.ts',
        // Repository is exercised by medium tests in test/vitest.config.medium.mjs.
        'src/fork/fork-person.repository.ts',
      ],
    },
    server: {
      deps: {
        fallbackCJS: true,
      },
    },
    env: {
      TZ: 'UTC',
    },
  },
  plugins: [swc.vite(), tsconfigPaths()],
});
