import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { S3Client, HeadObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { digest } from './store.mjs';
import { namedMediaKeys } from '../shared/model.mjs';
import { threeViews } from '../../site/src/lib/three-views.js';
import { DEFAULT_GALLERY_IMAGE_BASE_URL, galleryImageUrl } from '../../site/src/lib/gallery-media.js';

export function r2Configured() {
  return Boolean(process.env.GALLERY_R2_ACCESS_KEY_ID && process.env.GALLERY_R2_SECRET_ACCESS_KEY);
}
export function createR2Storage() {
  if (!r2Configured()) throw new Error('.env.r2.local にR2の認証情報を設定してください。');
  const account = process.env.GALLERY_R2_ACCOUNT_ID || 'faa0e314dd7555b60e645f49ffc377d6';
  if (!/^[a-f0-9]{32}$/.test(account)) throw new Error('R2アカウントIDが不正です。');
  const Bucket = process.env.GALLERY_R2_BUCKET || 'home-gallery';
  const client = new S3Client({ region: 'auto', endpoint: `https://${account}.r2.cloudflarestorage.com`, credentials: { accessKeyId: process.env.GALLERY_R2_ACCESS_KEY_ID, secretAccessKey: process.env.GALLERY_R2_SECRET_ACCESS_KEY } });
  return {
    async head(Key) {
      try { return await client.send(new HeadObjectCommand({ Bucket, Key })); }
      catch (error) { if (error.$metadata?.httpStatusCode === 404) return null; throw error; }
    },
    put(Key, Body, hash) {
      return client.send(new PutObjectCommand({ Bucket, Key, Body, IfNoneMatch: '*', ContentType: 'image/webp', CacheControl: 'public, max-age=31536000, immutable', Metadata: { sha256: hash } }));
    },
    close() { client.destroy(); },
  };
}

export async function uploadPending(store, revision, ids, storage) {
  return store.exclusive(async () => {
    const state = await store.read();
    if (state.revision !== revision) { const error = new Error('内容が更新されています。再読み込みしてください。'); error.status = 409; throw error; }
    if (!Array.isArray(ids) || !ids.length || new Set(ids).size !== ids.length || ids.some(id => !state.content.media.some(photo => photo.id === id && !photo.uploaded))) throw new Error('アップロード対象が不正です。');
    const succeeded = [], failures = [];
    for (const id of ids) {
      const photo = state.content.media.find(item => item.id === id);
      try {
        const named = namedMediaKeys(photo.originalName);
        if (state.library.some(other => other.id !== id && (other.displayKey === named.displayKey
          || (other.originalName && namedMediaKeys(other.originalName).displayKey === named.displayKey)))) throw new Error(`同じ保存名の別画像が登録されています: ${named.displayKey}。ファイル名を変更してください。`);
        const uploads = [];
        for (const key of [named.displayKey, named.thumbnailKey]) {
          const localKey = `${key === named.displayKey ? 'display' : 'thumbnails'}/${photo.id}.webp`;
          const bytes = await readFile(path.join(store.root, '.cms/media', localKey));
          const hash = digest(bytes), objectKey = `media/${key}`;
          const matches = head => head?.ContentLength === bytes.length && head?.Metadata?.sha256 === hash;
          const before = await storage.head(objectKey);
          if (before && !matches(before)) throw new Error('同名のR2オブジェクトと内容が一致しません。上書きしません。');
          uploads.push({ bytes, hash, objectKey, matches, before });
        }
        for (const { bytes, hash, objectKey, matches, before } of uploads) {
          if (!before) {
            try { await storage.put(objectKey, bytes, hash); }
            catch (error) { if (error.$metadata?.httpStatusCode !== 412) throw error; }
          }
          if (!matches(await storage.head(objectKey))) throw new Error('R2保存後の照合に失敗しました。');
        }
        const oldUrls = [galleryImageUrl(photo.displayKey, DEFAULT_GALLERY_IMAGE_BASE_URL), `${DEFAULT_GALLERY_IMAGE_BASE_URL}/${photo.displayKey}`];
        for (const avatar of state.content.avatars) for (const theme of avatar.themes) for (const outfit of theme.outfits) {
          for (const view of threeViews(outfit.threeView)) {
            if (oldUrls.includes(view.src)) view.src = galleryImageUrl(named.displayKey, DEFAULT_GALLERY_IMAGE_BASE_URL);
          }
        }
        Object.assign(photo, named);
        photo.uploaded = true;
        succeeded.push(id);
      } catch (error) { failures.push({ id, message: error.$metadata ? `R2への通信に失敗しました (${error.name})。` : error.message }); }
    }
    const saved = succeeded.length ? await store.write(state.content, revision) : state;
    return { ...saved, succeeded, failures };
  });
}
