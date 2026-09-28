import test from 'node:test';
import assert from 'node:assert/strict';
import gallery from '../../site/src/data/gallery.json' with { type: 'json' };
import { avatars as configuredAvatars } from '../../site/src/lib/avatars.js';
import content from '../../site/src/data/content.json' with { type: 'json' };
import { publicGallery } from '../../site/src/lib/media-library.js';
import { galleryPhotoHref, galleryPhotoIndex, galleryReturnHref, galleryNavigationPhotos, outfitGalleryPhotos, photoOutfitLinks } from '../../site/src/lib/avatar-gallery.js';
const avatars = [{id:'base-a',name:'素体 A',themes:[{id:'everyday',name:'日常',outfits:[{id:'standard',name:'基本コーデ'},{id:'outing',name:'お出かけコーデ'}]}]}];

test('related navigation uses only the originating outfit order, independently of gallery order and photo URL', () => {
  const photos = [{ id: 'first' }, { id: 'unrelated' }, { id: 'last' }];
  const data = [{ id: 'base', themes: [{ id: 'theme', outfits: [
    { id: 'outfit', galleryPhotoIds: ['last', 'missing', 'first', 'last'] },
    { id: 'other', galleryPhotoIds: ['unrelated'] },
  ] }] }];
  for (const returnTo of ['/avatars/#/base/theme', '/avatars/#/base/theme/outfit']) {
    for (const photo of ['last', 'first']) {
      const search = `?${new URLSearchParams({ returnTo, photo })}`;
      assert.deepEqual(galleryNavigationPhotos(search, data, photos).map(item => item.id), ['last', 'first']);
    }
  }
  assert.equal(galleryNavigationPhotos('', data, photos), photos);
});

test('empty and single-image related collections never expand to the full gallery', () => {
  const data = [{ id: 'base', themes: [{ id: 'theme', outfits: [
    { id: 'empty', galleryPhotoIds: ['deleted'] },
    { id: 'single', galleryPhotoIds: [gallery[0].id] },
  ] }] }];
  for (const [id, expected] of [['empty', []], ['single', [gallery[0]]]]) {
    const search = `?${new URLSearchParams({ returnTo: `/avatars/#/base/theme/${id}` })}`;
    assert.deepEqual(galleryNavigationPhotos(search, data, gallery), expected);
  }
});

test('related photo links preserve the exact originating theme or outfit page', () => {
  for (const returnTo of ['/avatars/#/base-a/everyday', '/avatars/#/base-a/everyday/outing']) {
    const url = new URL(galleryPhotoHref(gallery[0].id, returnTo), 'https://example.test');
    assert.equal(galleryReturnHref(url.search, avatars), returnTo);
    url.searchParams.set('photo', gallery[1].id);
    assert.equal(galleryReturnHref(url.search, avatars), returnTo);
  }
});

test('ordinary gallery links have no return destination; external and invalid destinations are rejected', () => {
  assert.equal(galleryReturnHref(new URL(galleryPhotoHref(gallery[0].id), 'https://example.test').search, avatars), null);
  for (const returnTo of ['https://example.test/avatars/#/base-a/everyday', '//example.test/', 'javascript:alert(1)', '/avatars/#/missing', '/avatars/#/base-a', '/avatars/#/base-a/everyday/missing']) {
    assert.equal(galleryReturnHref(`?${new URLSearchParams({ returnTo })}`, avatars), null, returnTo);
  }
});

test('photo links select the same ID even when gallery order changes', () => {
  const photo = { id: '写真 #1 / &青' };
  const url = new URL(galleryPhotoHref(photo.id), 'https://example.test');
  assert.equal(url.pathname, '/gallery/');
  assert.equal(galleryPhotoIndex(url.search, [photo, { id: 'other' }]), 0);
  assert.equal(galleryPhotoIndex(url.search, [{ id: 'other' }, photo]), 1);
});

test('absent or unknown photo IDs do not open a different image', () => {
  for (const search of ['', '?photo=', '?photo=missing', '?photo=%E0%A4%A']) {
    assert.equal(galleryPhotoIndex(search, gallery), -1);
  }
});

test('related photos keep configured order, deduplicate and omit missing images', () => {
  const first = { id: 'first' }, second = { id: 'second' };
  assert.deepEqual(outfitGalleryPhotos({ galleryPhotoIds: ['second', 'missing', 'second', 'first'] }, [first, second]), [second, first]);
});

test('related photos are optional and are not inferred from a representative photo', () => {
  assert.deepEqual(outfitGalleryPhotos(undefined, gallery), []);
  assert.deepEqual(outfitGalleryPhotos({ photo: gallery[0].id }, gallery), []);
  assert.deepEqual(photoOutfitLinks('unlinked', avatars), []);
});

test('a photo shared by multiple outfits links to each exact introduction', () => {
  const data = [{ id: '素体 A', name: '素体 A', themes: [{ id: 'daily', name: '日常', outfits: [
    { id: 'first', name: '一着目', galleryPhotoIds: ['shared'] },
    { id: 'second', name: '二着目', galleryPhotoIds: ['shared'] },
  ] }] }];
  const links = photoOutfitLinks('shared', data);
  assert.equal(links.length, 2);
  assert.equal(links[0].href, '/avatars/#/%E7%B4%A0%E4%BD%93%20A/daily/first');
  assert.equal(links[1].label, '素体 A / 日常 / 二着目');
});

test('every configured relation points to an existing photo with a reverse introduction link', () => {
  const ids = new Set(publicGallery(content, gallery).map(photo => photo.id));
  for (const avatar of configuredAvatars) for (const theme of avatar.themes) for (const outfit of theme.outfits) {
    for (const id of outfit.galleryPhotoIds ?? []) {
      assert.ok(ids.has(id), `Missing gallery photo: ${id}`);
      assert.ok(photoOutfitLinks(id, configuredAvatars).some(link => link.label === `${avatar.name} / ${theme.name} / ${outfit.name}`));
    }
  }
});
