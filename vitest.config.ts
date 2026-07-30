import { defineConfig } from 'vitest/config';

/* Ayrı dosya: vite.config.ts derleme yapılandırması, test ayarı onu kirletmesin. */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
