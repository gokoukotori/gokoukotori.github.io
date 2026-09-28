import { readFile, writeFile, mkdir, rename, unlink, readdir, stat } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import path from 'node:path';
import sharp from 'sharp';
import { validateContent, photoUses, namedMediaKeys } from '../shared/model.mjs';
import { mediaLibrary } from '../../site/src/lib/media-library.js';

export const digest = value => createHash('sha256').update(value).digest('hex');
export class CmsStore {
  constructor(root) { this.root = root; this.queue = Promise.resolve(); }
  exclusive(task) { const result = this.queue.then(task); this.queue = result.catch(() => {}); return result; }
  async read() {
    const raw = await readFile(path.join(this.root, 'site/src/data/content.json'), 'utf8');
    const originalPhotos = JSON.parse(await readFile(path.join(this.root, 'site/src/data/gallery.json'), 'utf8'));
    const content = validateContent(JSON.parse(raw), originalPhotos);
    return { content, revision: digest(raw), originalPhotos, library: mediaLibrary(content, originalPhotos) };
  }
  async write(content, revision) {
    const current = await this.read();
    if (current.revision !== revision) { const error = new Error('別の画面またはファイルで更新されています。再読み込みしてから編集してください。'); error.status = 409; throw error; }
    validateContent(content, current.originalPhotos);
    const backup = path.join(this.root, '.cms/backups');
    await mkdir(backup, { recursive: true });
    await writeFile(path.join(backup, `${Date.now()}-${randomUUID()}.json`), JSON.stringify(current.content, null, 2) + '\n');
    const target = path.join(this.root, 'site/src/data/content.json');
    const temporary = `${target}.${randomUUID()}.tmp`;
    await writeFile(temporary, JSON.stringify(content, null, 2) + '\n');
    await rename(temporary, target);
    // Saving has committed; cleanup failure must not be reported as a failed save.
    try { await this.pruneBackups(); }
    catch (error) { console.warn('CMSバックアップの整理に失敗しました。保存は完了しています。', error); }
    return this.read();
  }
  async pruneBackups() {
    const directory = path.join(this.root, '.cms/backups');
    const entries = await readdir(directory, { withFileTypes: true });
    const backups = await Promise.all(entries
      .filter(entry => entry.isFile() && /^\d+-[a-f0-9-]{36}\.json$/.test(entry.name))
      .map(async entry => ({ name: entry.name, modified: (await stat(path.join(directory, entry.name))).mtimeMs })));
    backups.sort((a, b) => b.modified - a.modified || b.name.localeCompare(a.name));
    for (const backup of backups.slice(10)) await unlink(path.join(directory, backup.name));
  }
  save(content, revision) {
    return this.exclusive(async () => {
      const current = await this.read();
      if (JSON.stringify(content.media) !== JSON.stringify(current.content.media)) throw new Error('画像ファイルの情報はアップロード画面から変更してください。');
      return this.write(content, revision);
    });
  }
  removePendingImage(id, revision) {
    return this.exclusive(async () => {
      const state = await this.read();
      if (state.revision !== revision) { const error = new Error('保存内容が更新されています。再読み込みしてください。'); error.status = 409; throw error; }
      const photo = state.content.media.find(item => item.id === id && !item.uploaded);
      if (!photo) throw new Error('未アップロードの追加画像だけを取り消せます。');
      if (photoUses(state.content, id).length) throw new Error('紹介ページで使用中です。先に画像の選択や関連付けを解除してください。');
      state.content.media = state.content.media.filter(item => item.id !== id);
      delete state.content.photoSettings[id];
      // Paths use the validated content ID, never the user-supplied original filename.
      const keys = [photo.displayKey, photo.thumbnailKey, ...['jpeg','png','webp'].map(ext => `originals/${photo.id}.${ext}`)];
      const files = [];
      for (const key of keys) {
        const file = path.join(this.root, '.cms/media', key);
        try { files.push({ file, bytes: await readFile(file) }); }
        catch (error) { if (error.code !== 'ENOENT') throw error; }
      }
      const removed = [];
      try {
        for (const entry of files) { await unlink(entry.file); removed.push(entry); }
        return await this.write(state.content, revision);
      } catch (error) {
        // Keep the registered image usable when deletion or saving fails.
        for (const entry of removed) await writeFile(entry.file, entry.bytes, { flag: 'wx' });
        throw error;
      }
    });
  }
  importImage(buffer, name, capturedAt, revision) {
    return this.exclusive(async () => {
      const current = await this.read();
      if (current.revision !== revision) { const error = new Error('保存内容が更新されています。再読み込みしてください。'); error.status = 409; throw error; }
      const metadata = await sharp(buffer, { limitInputPixels: 80000000 }).metadata();
      if (!['jpeg','png','webp'].includes(metadata.format) || (metadata.pages ?? 1) !== 1) throw new Error('静止画のJPEG・PNG・WebPを選んでください。');
      const id = `cms-${digest(buffer).slice(0, 32)}`;
      const named = namedMediaKeys(name);
      if (current.content.media.some(photo => photo.id !== id && namedMediaKeys(photo.originalName).displayKey === named.displayKey)
        || current.originalPhotos.some(photo => photo.displayKey === named.displayKey)) throw new Error(`同じ保存名の別画像が登録されています: ${named.displayKey}。ファイル名を変更してください。`);
      if (current.content.media.some(photo => photo.id === id)) return { ...current, duplicate: true };
      const timeMatch = name.match(/^VRChat_(\d{4}-\d{2}-\d{2})_(\d{2})-(\d{2})-(\d{2})\.(\d{3})/);
      const time = timeMatch ? `${timeMatch[1]}T${timeMatch[2]}:${timeMatch[3]}:${timeMatch[4]}.${timeMatch[5]}+09:00` : capturedAt;
      if (!Number.isFinite(Date.parse(time))) throw new Error('撮影日時が不正です。');
      const image = sharp(buffer, { limitInputPixels: 80000000 }).rotate().withIccProfile('srgb');
      const display = await image.clone().resize({ width: 3840, height: 3840, fit: 'inside', withoutEnlargement: true }).webp({ quality: 92 }).toBuffer({ resolveWithObject: true });
      const thumbnail = await image.clone().resize({ width: 640, height: 640, fit: 'inside', withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();
      for (const dir of ['display','thumbnails','originals']) await mkdir(path.join(this.root, '.cms/media', dir), { recursive: true });
      // Content hashes make retries immutable; files become referenced only after both conversions succeed.
      await writeFile(path.join(this.root, '.cms/media/display', `${id}.webp`), display.data);
      await writeFile(path.join(this.root, '.cms/media/thumbnails', `${id}.webp`), thumbnail);
      await writeFile(path.join(this.root, '.cms/media/originals', `${id}.${metadata.format}`), buffer);
      current.content.media.push({ id, capturedAt: time, displayKey: `display/${id}.webp`, thumbnailKey: `thumbnails/${id}.webp`, width: display.info.width, height: display.info.height, uploaded: false, originalName: name });
      return this.write(current.content, revision);
    });
  }
}
