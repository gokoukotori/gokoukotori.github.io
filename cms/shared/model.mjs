import { mediaLibrary } from '../../site/src/lib/media-library.js';
import { threeViews } from '../../site/src/lib/three-views.js';
import { normalizeGalleryImageKey } from '../../site/src/lib/gallery-media.js';

export function duplicateTheme(theme) {
  const copy = structuredClone(theme);
  const suffix = '（コピー）';
  copy.id = `theme-${crypto.randomUUID()}`;
  copy.name = `${theme.name.slice(0, 10000 - suffix.length)}${suffix}`;
  for (const outfit of copy.outfits) outfit.id = `outfit-${crypto.randomUUID()}`;
  return copy;
}

export function namedMediaKeys(name) {
  if (typeof name !== 'string' || !name || name.length > 255 || /[\/\\\x00-\x1f\x7f]/.test(name)) throw new Error('元ファイル名が不正です。');
  const stem = name.replace(/\.(?:jpe?g|png|webp)$/i, '');
  if (!stem || stem === '.' || stem === '..') throw new Error('元ファイル名が不正です。');
  return { displayKey: `display/${stem}.webp`, thumbnailKey: `thumbnails/${stem}.webp` };
}

function check(condition, message) { if (!condition) throw new Error(message); }
function text(value, label, required = false) {
  check(typeof value === 'string' && value.length <= 10000 && (!required || value.trim()), `${label}を入力してください（最大10000文字）。`);
}
function list(value, label) { check(Array.isArray(value) && value.length <= 10000, `${label}の形式が不正です。`); }
function credits(value) {
  list(value, '使用商品');
  for (const credit of value) {
    keys(credit, ['category','name','url'], '使用商品'); text(credit.category, '分類', true); text(credit.name, '商品名', true);
    check(safeUrl(credit.url), '使用商品のURLが不正です。');
  }
}
function keys(value, allowed, label) {
  check(value && typeof value === 'object' && !Array.isArray(value), `${label}の形式が不正です。`);
  check(Object.keys(value).every(key => allowed.includes(key)), `${label}に未対応の項目があります。`);
}
export function safeUrl(value, required = false) {
  if (!value && !required) return true;
  if (typeof value !== 'string' || /[\s\\\x00-\x1f]/.test(value)) return false;
  if (value.startsWith('/') && !value.startsWith('//')) return !value.split(/[/?#]/).includes('..');
  try { return ['https:', 'http:'].includes(new URL(value).protocol); } catch { return false; }
}

export function validateContent(content, originalPhotos) {
  keys(content, ['version','isSampleContent','avatars','media','photoSettings'], 'コンテンツ');
  check(content.version === 1 && typeof content.isSampleContent === 'boolean', 'コンテンツのバージョンが不正です。');
  list(content.media, '追加画像');
  const ids = new Set(originalPhotos.map(photo => photo.id));
  for (const photo of content.media) {
    keys(photo, ['id','capturedAt','displayKey','thumbnailKey','width','height','uploaded','originalName'], '追加画像');
    check(/^cms-[a-f0-9]{32}$/.test(photo.id) && !ids.has(photo.id), '画像IDが不正または重複しています。');
    ids.add(photo.id);
    const legacyKeys = photo.displayKey === `display/${photo.id}.webp` && photo.thumbnailKey === `thumbnails/${photo.id}.webp`;
    const namedKeys = legacyKeys ? null : namedMediaKeys(photo.originalName);
    check(legacyKeys || (photo.uploaded && photo.displayKey === namedKeys.displayKey && photo.thumbnailKey === namedKeys.thumbnailKey), '画像パスが不正です。');
    check(Number.isInteger(photo.width) && photo.width > 0 && Number.isInteger(photo.height) && photo.height > 0, '画像サイズが不正です。');
    check(Number.isFinite(Date.parse(photo.capturedAt)) && typeof photo.uploaded === 'boolean', '画像の状態が不正です。');
    text(photo.originalName, '画像名');
  }
  check(content.photoSettings && typeof content.photoSettings === 'object' && !Array.isArray(content.photoSettings), '写真設定が不正です。');
  for (const [id, settings] of Object.entries(content.photoSettings)) {
    check(ids.has(id), `写真が見つかりません: ${id}`);
    keys(settings, ['listed','capturedAt'], '写真設定');
    if ('listed' in settings) check(typeof settings.listed === 'boolean', '掲載設定が不正です。');
    if ('capturedAt' in settings) check(Number.isFinite(Date.parse(settings.capturedAt)), '撮影日時が不正です。');
  }
  const listed = new Set(mediaLibrary(content, originalPhotos).filter(photo => photo.listed).map(photo => photo.id));
  const image = (id) => check(ids.has(id), `代表写真を選択してください: ${id || '未設定'}`);
  function items(value, label) {
    list(value, label);
    const unique = new Set();
    for (const item of value) {
      check(typeof item.id === 'string' && /^[a-z0-9][a-z0-9_-]{0,79}$/.test(item.id) && !unique.has(item.id), `${label}のIDが不正または重複しています。`);
      unique.add(item.id); text(item.name, `${label}の名前`, true); text(item.description, '説明'); image(item.photo);
    }
  }
  items(content.avatars, '素体');
  for (const avatar of content.avatars) {
    keys(avatar, ['id','name','photo','caption','description','sourceUrl','themes'], '素体'); text(avatar.caption, '紹介');
    if ('sourceUrl' in avatar) {
      text(avatar.sourceUrl, 'URL');
      check(avatar.sourceUrl === '' || (/^https?:\/\//i.test(avatar.sourceUrl) && safeUrl(avatar.sourceUrl, true)), 'URLはhttp://またはhttps://で始まるURLを入力してください。');
    }
    items(avatar.themes, 'テーマ');
    for (const theme of avatar.themes) {
      keys(theme, ['id','name','label','photo','description','credits','outfits'], 'テーマ'); text(theme.label, '英字見出し');
      if ('credits' in theme) credits(theme.credits);
      items(theme.outfits, 'バリエーション');
      for (const outfit of theme.outfits) {
        keys(outfit, ['id','name','photo','description','credits','threeView','galleryPhotoIds','additionalPhotoIds'], 'バリエーション');
        credits(outfit.credits);
        if ('additionalPhotoIds' in outfit) {
          list(outfit.additionalPhotoIds, '追加メイン画像');
          check(new Set(outfit.additionalPhotoIds).size === outfit.additionalPhotoIds.length, '追加メイン画像が重複しています。');
          for (const id of outfit.additionalPhotoIds) check(ids.has(id), `追加メイン画像が見つかりません: ${id}`);
        }
        const views = threeViews(outfit.threeView);
        list(views, '三面図');
        for (const view of views) {
          keys(view, ['src','caption'], '三面図'); check(safeUrl(view.src), '三面図のURLが不正です。');
          if (view.caption !== undefined) text(view.caption, '三面図の説明');
        }
        if (outfit.galleryPhotoIds) {
          list(outfit.galleryPhotoIds, '関連フォト');
          check(new Set(outfit.galleryPhotoIds).size === outfit.galleryPhotoIds.length, '関連フォトが重複しています。');
          for (const id of outfit.galleryPhotoIds) check(listed.has(id), `関連フォトに使用中の写真は掲載解除できません。先に関連付けを解除してください: ${id}`);
        }
      }
    }
  }
  return content;
}

export function photoUses(content, id) {
  const uses = [];
  const displayKey = content.media.find(photo => photo.id === id)?.displayKey || `display/${id}.webp`;
  for (const avatar of content.avatars) {
    if (avatar.photo === id) uses.push(`${avatar.name}の代表写真`);
    for (const theme of avatar.themes) {
      if (theme.photo === id) uses.push(`${avatar.name} / ${theme.name}の代表写真`);
      for (const outfit of theme.outfits) {
        const label = `${avatar.name} / ${theme.name} / ${outfit.name}`;
        if (outfit.photo === id) uses.push(`${label}の代表写真`);
        if (outfit.additionalPhotoIds?.includes(id)) uses.push(`${label}の追加メイン画像`);
        if (outfit.galleryPhotoIds?.includes(id)) uses.push(`${label}の関連フォト`);
        if (threeViews(outfit.threeView).some(view => [displayKey, normalizeGalleryImageKey(displayKey)].some(key => view.src?.endsWith(`/${key}`)))) uses.push(`${label}の三面図`);
      }
    }
  }
  return uses;
}
