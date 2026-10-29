import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// Static site for Cloudflare Pages. Pages Functions in /functions are
// deployed by Cloudflare Pages alongside the static output in /dist.
// No site URL is asserted here: the domain is not yet chosen (OQ-14).
// Canonical URLs in pages use the [live-domain] placeholder pattern from
// the SEO plan and must be replaced once, in one place, at deploy time.
export default defineConfig({
  output: 'static',
  trailingSlash: 'always',
  vite: {
    plugins: [tailwindcss()],
  },
});
