import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';
export default defineConfig({
  plugins: [sveltekit()],
  // Transform sanitize-html's CommonJS require of ESM-only htmlparser2 at
  // build time. Lambda disables Node's experimental require(ESM) support.
  ssr: {
    noExternal: [
      'sanitize-html',
      'htmlparser2',
      'domhandler',
      'domutils',
      'dom-serializer',
      'domelementtype',
      'entities',
    ],
  },
  server: { port: 5173, strictPort: true },
  test: { include: ['tests/**/*.test.ts'] },
});
