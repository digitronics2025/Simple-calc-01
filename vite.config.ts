import { type Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

/**
 * Adds a strict Content-Security-Policy to the built page only: the app loads
 * nothing but its own files. The dev server is left alone because its
 * hot-reload client injects styles and opens a websocket.
 */
function contentSecurityPolicy(): Plugin {
  const policy = "default-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; form-action 'none'";
  return {
    name: 'simple-calc-csp',
    apply: 'build',
    transformIndexHtml: () => [
      { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: policy }, injectTo: 'head' },
    ],
  };
}

export default defineConfig({
  // Relative asset paths so dist/ works from any static host or sub-path.
  base: './',
  plugins: [contentSecurityPolicy()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
  },
});
