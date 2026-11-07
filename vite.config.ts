import { defineConfig } from 'vite';
import { config } from './server/src/config.ts';

export default defineConfig({
  root: 'client',
  build: { outDir: '../dist', emptyOutDir: true },
  server: {
    host: config.host,
    port: config.clientPort,
    strictPort: true,
    proxy: { '/api': `http://${config.host}:${config.port}` },
    fs: { strict: true, allow: ['client', 'shared'] },
  },
});
