import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// Static site for Cloudflare Pages. Pages Functions in /functions are
// deployed by Cloudflare Pages alongside the static output in /dist.
// No site URL is asserted here: canonical URLs in pages use the live
// domain (https://pakistan-finance-calculators.pages.dev).
export default defineConfig({
  output: 'static',
  trailingSlash: 'always',
  // CSP style-src has no 'unsafe-inline', so stylesheets must never be
  // inlined as <style> tags: Astro's default inlineStylesheets 'auto'
  // inlines per-page CSS into the HTML, which style-src 'self' would
  // block. 'never' forces every stylesheet into an external /_astro/*.css
  // file (covered by style-src 'self'). Guarded by tests/csp.test.ts.
  build: {
    inlineStylesheets: 'never',
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
