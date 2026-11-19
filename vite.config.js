import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

const bundledLibraries = [
  'three',
  '@fontsource-variable/fraunces',
  '@fontsource-variable/nunito',
];

export default defineConfig({
  plugins: [
    {
      name: 'bundled-license-notices',
      apply: 'build',
      transformIndexHtml() {
        const notices = bundledLibraries.map((library) => {
          const path = new URL(`./node_modules/${library}/LICENSE`, import.meta.url);
          return `${library}\n${readFileSync(path, 'utf8').trim()}`;
        });
        return [{
          tag: 'script',
          attrs: { type: 'text/plain', id: 'third-party-notices' },
          children: notices.join('\n\n'),
          injectTo: 'body',
        }];
      },
    },
    viteSingleFile({ removeViteModuleLoader: true }),
  ],
});
