import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';
export default defineConfig({
  plugins: [sveltekit()],
  // Bundle the complete Markdown dependency graph. Partial bundling leaves
  // generated require aliases that serverless dependency tracing can miss.
  // Lambda also disables Node's experimental require(ESM) support.
  ssr: {
    noExternal: [
      'sanitize-html',
      'htmlparser2',
      'domhandler',
      'domutils',
      'dom-serializer',
      'domelementtype',
      'entities',
      'marked',
      'escape-string-regexp',
      'is-plain-object',
      'deepmerge',
      'parse-srcset',
      'postcss',
      'nanoid',
      'picocolors',
      'source-map-js',
      'launder',
      'dayjs',
    ],
  },
  server: { port: 5173, strictPort: true },
  test: { include: ['tests/**/*.test.ts'] },
});
