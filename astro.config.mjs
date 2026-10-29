import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// Static site for Cloudflare Pages. Pages Functions in /functions are
// deployed by Cloudflare Pages alongside the static output in /dist.
// No site URL is asserted here: canonical URLs in pages use the live
// domain (https://pakistan-finance-calculators.pages.dev).
export default defineConfig({
  output: 'static',
  trailingSlash: 'always',
  vite: {
    plugins: [tailwindcss()],
  },
});
