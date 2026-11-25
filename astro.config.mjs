// @ts-check
import { defineConfig } from 'astro/config';

import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  // Live domain — powers canonical URLs, Open Graph tags, and the sitemap.
  site: 'https://joinskillbridge.com',

  // "Everything We Use" was renamed to the SkillBridge Starter Toolkit because the
  // old title claimed exhaustiveness the list does not have. Anything already
  // pointing at the old URL still lands in the right place.
  // (The old /everything-we-use.pdf keeps working too — build-pdf.mjs writes both
  // filenames, since a static host cannot redirect a .pdf to a .pdf.)
  redirects: {
    '/resources/everything-we-use': '/resources/skillbridge-starter-toolkit',
  },

  // The /get pages are DM landing pages (noindex), so they stay out of the sitemap.
  integrations: [sitemap({ filter: (page) => !page.includes('/get/') })],
});
