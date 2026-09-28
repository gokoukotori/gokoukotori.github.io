import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { CmsStore } from './store.mjs';
import { r2Configured, createR2Storage, uploadPending } from './r2.mjs';
import { DEFAULT_GALLERY_IMAGE_BASE_URL, normalizeGalleryImageKey } from '../../site/src/lib/gallery-media.js';

function fail(status, message) { const error = new Error(message); error.status = status; throw error; }
export function checkRequest(req, origin, token, mutation = false) {
  if (req.headers.host !== new URL(origin).host) fail(403, 'localhost専用です。');
  if (req.headers.origin && req.headers.origin !== origin) fail(403, '別のサイトからのアクセスは許可されていません。');
  if (req.headers['sec-fetch-site'] === 'cross-site') fail(403, '別のサイトからのアクセスは許可されていません。');
  if (mutation && (req.headers.origin !== origin || req.headers['x-cms-token'] !== token)) fail(403, '管理画面を再読み込みしてください。');
}
async function readBody(req, limit) {
  const chunks = []; let length = 0;
  for await (const chunk of req) { length += chunk.length; if (length > limit) fail(413, 'ファイルが大きすぎます（画像は25MBまで）。'); chunks.push(chunk); }
  return Buffer.concat(chunks);
}
export function createCmsApi(root, origin, options = {}) {
  const store = new CmsStore(root), token = randomBytes(32).toString('hex');
  const json = (res, status, data) => { res.writeHead(status, { 'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff' }); res.end(JSON.stringify(data)); };
  return async (req, res, next) => {
    if (!req.url.startsWith('/__cms/')) return next();
    try {
      const url = new URL(req.url, origin), mutation = req.method !== 'GET';
      checkRequest(req, origin, token, mutation);
      if (req.method === 'GET' && url.pathname === '/__cms/state') {
        const state = await store.read();
        return json(res, 200, { ...state, token, r2Configured: r2Configured() });
      }
      if (req.method === 'GET' && url.pathname.startsWith('/__cms/media/')) {
        const key = decodeURIComponent(url.pathname.slice('/__cms/media/'.length));
        normalizeGalleryImageKey(key);
        const state = await store.read();
        const photo = state.library.find(photo => [photo.displayKey, photo.thumbnailKey].includes(key));
        if (!photo) fail(404, '画像が見つかりません。');
        const localKey = photo.id.startsWith('cms-') ? `${key === photo.displayKey ? 'display' : 'thumbnails'}/${photo.id}.webp` : key;
        try {
          const bytes = await readFile(path.join(root, '.cms/media', localKey));
          res.writeHead(200, { 'Content-Type':'image/webp', 'Cache-Control':'no-cache', 'X-Content-Type-Options':'nosniff' }); return res.end(bytes);
        } catch (error) {
          if (error.code !== 'ENOENT') throw error;
          res.writeHead(302, { Location: `${DEFAULT_GALLERY_IMAGE_BASE_URL}/${normalizeGalleryImageKey(key)}` }); return res.end();
        }
      }
      if (req.method !== 'POST') fail(404, '操作が見つかりません。');
      if (url.pathname === '/__cms/import') {
        if (req.headers['content-type'] !== 'application/octet-stream') fail(415, '画像の送信形式が不正です。');
        const buffer = await readBody(req, 25 * 1024 * 1024);
        return json(res, 200, await store.importImage(buffer, url.searchParams.get('name') || 'image', url.searchParams.get('capturedAt'), req.headers['x-cms-revision']));
      }
      if (!req.headers['content-type']?.startsWith('application/json')) fail(415, 'JSON形式で送信してください。');
      const body = JSON.parse((await readBody(req, 5 * 1024 * 1024)).toString('utf8'));
      if (url.pathname === '/__cms/content') return json(res, 200, await store.save(body.content, body.revision));
      if (url.pathname === '/__cms/remove-pending') return json(res, 200, await store.removePendingImage(body.id, body.revision));
      if (url.pathname === '/__cms/r2') {
        if (body.confirm !== true) fail(400, 'アップロードの確認が必要です。');
        const storage = (options.storageFactory || createR2Storage)();
        try { return json(res, 200, await uploadPending(store, body.revision, body.ids, storage)); }
        finally { storage.close(); }
      }
      if (url.pathname === '/__cms/build') {
        return await store.exclusive(async () => {
          const state = await store.read();
          if (body.revision !== state.revision) fail(409, '内容が更新されています。再読み込みしてください。');
          if (state.content.media.some(photo => !photo.uploaded)) fail(400, '未アップロードの画像があります。R2アップロード後にビルドしてください。');
          const { build } = await import('vite');
          await build({ root: path.join(root, 'site'), configFile: path.join(root, 'vite.config.js'), logLevel: 'warn' });
          return json(res, 200, { message: '公開用ファイルをdistに作成しました。Gitへのコミット・プッシュは行っていません。' });
        });
      }
      fail(404, '操作が見つかりません。');
    } catch (error) {
      json(res, error.status || 400, { error: error.message || '処理に失敗しました。' });
    }
  };
}
