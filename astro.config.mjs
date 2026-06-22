// @ts-check
import { defineConfig } from 'astro/config';

import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  // Live domain — powers canonical URLs, Open Graph tags, and the sitemap.
  site: 'https://joinskillbridge.com',

  integrations: [sitemap()],
});
