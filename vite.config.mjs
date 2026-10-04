import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';

// Insert the same footer before Vite processes its existing image URLs.
const sharedFooter = {
  name: 'shared-footer',
  transformIndexHtml: {
    order: 'pre',
    handler: html => html.replace('<!-- shared-footer -->', () =>
      readFileSync(new URL('./src/footer/footer.html', import.meta.url), 'utf8').trimEnd()),
  },
};

export default defineConfig({
  plugins: [react(), sharedFooter],
  build: {
    rolldownOptions: {
      input: { main: 'index.html', projects: 'projects/index.html', projectsLegacy: 'projects.html' },
    },
  },
});
