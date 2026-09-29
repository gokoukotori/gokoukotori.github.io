import test from 'node:test';
import assert from 'node:assert/strict';
import { outfitPhotoIds } from '../../site/src/lib/outfit-photos.js';

test('existing outfits keep only their representative image', () => {
  assert.deepEqual(outfitPhotoIds({ photo:'cover' }), ['cover']);
  assert.deepEqual(outfitPhotoIds({ photo:'cover', additionalPhotoIds:[] }), ['cover']);
});

test('main images preserve their own order without mixing in related photos or three views', () => {
  const outfit = {
    photo:'cover', additionalPhotoIds:['detail-b','detail-a'],
    galleryPhotoIds:['related'], threeView:[{src:'/three.webp'}],
  };
  assert.deepEqual(outfitPhotoIds(outfit), ['cover','detail-b','detail-a']);
  assert.deepEqual(outfitPhotoIds({ photo:'other-cover', additionalPhotoIds:['other-detail'] }), ['other-cover','other-detail']);
  assert.deepEqual(outfit.additionalPhotoIds, ['detail-b','detail-a']);
});

test('a representative image also present in additional images is shown only once', () => {
  assert.deepEqual(outfitPhotoIds({ photo:'cover', additionalPhotoIds:['detail','cover'] }), ['cover','detail']);
});
