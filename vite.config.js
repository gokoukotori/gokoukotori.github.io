import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { validateContent } from './cms/shared/model.mjs';

// https://vite.dev/config/
export default defineConfig({
  root: fileURLToPath(new URL('./site/', import.meta.url)),
  envDir: fileURLToPath(new URL('./', import.meta.url)),
  cacheDir: fileURLToPath(new URL('./node_modules/.vite', import.meta.url)),
  plugins: [tailwindcss(), svelte({ configFile: fileURLToPath(new URL('./svelte.config.js', import.meta.url)) }), {
    name: 'validate-public-content',
    apply: 'build',
    async buildStart() {
      const content = JSON.parse(await readFile(new URL('./site/src/data/content.json', import.meta.url), 'utf8'));
      const photos = JSON.parse(await readFile(new URL('./site/src/data/gallery.json', import.meta.url), 'utf8'));
      validateContent(content, photos);
      if (content.media.some(photo => !photo.uploaded)) throw new Error('CMSに未アップロード画像があります。R2へのアップロードを完了してから公開用ビルドを実行してください。');
    },
  }],
  build: {
    outDir: fileURLToPath(new URL('./dist/', import.meta.url)),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        home: fileURLToPath(new URL('./site/index.html', import.meta.url)),
        gallery: fileURLToPath(new URL('./site/gallery/index.html', import.meta.url)),
        avatars: fileURLToPath(new URL('./site/avatars/index.html', import.meta.url)),
      },
    },
  },
});
