import test from 'node:test';
import assert from 'node:assert/strict';
import gallery from '../../site/src/data/gallery.json' with { type: 'json' };
import { avatars as configuredAvatars } from '../../site/src/lib/avatars.js';
import content from '../../site/src/data/content.json' with { type: 'json' };
import { mediaLibrary } from '../../site/src/lib/media-library.js';
import { avatarHref, resolveAvatarRoute } from '../../site/src/lib/avatar-navigation.js';
const avatars = [{ id:'base-a', name:'素体 A', themes:[{ id:'everyday', outfits:[{id:'standard',name:'基本コーデ'},{id:'outing',name:'お出かけコーデ'}] }] }];

test('the collection and base links do not select a theme implicitly', () => {
  assert.deepEqual(resolveAvatarRoute('', avatars), { notFound: false });
  assert.deepEqual(resolveAvatarRoute('#/', avatars), { notFound: false });
  const route = resolveAvatarRoute('#/base-a', avatars);
  assert.equal(route.avatar.name, '素体 A');
  assert.equal(route.theme, undefined);
  assert.equal(route.notFound, false);
});

test('a theme opens its first outfit and an outfit deep link restores the selected look', () => {
  const initial = resolveAvatarRoute('#/base-a/everyday', avatars);
  const alternate = resolveAvatarRoute('#/base-a/everyday/outing', avatars);
  assert.equal(initial.outfit.id, 'standard');
  assert.equal(alternate.outfit.name, 'お出かけコーデ');
  assert.equal(alternate.theme.id, initial.theme.id);
  assert.equal(alternate.notFound, false);
});

test('unknown IDs, extra path segments and malformed encoding show not found', () => {
  for (const hash of ['#/missing', '#/base-a/missing', '#/base-a/everyday/missing', '#/base-a/everyday/standard/extra', '#/%E0%A4%A']) {
    assert.equal(resolveAvatarRoute(hash, avatars).notFound, true, hash);
  }
});

test('generated links round trip IDs that require URL encoding', () => {
  const data = [{ id: '素体 A', themes: [{ id: '和風 / 青', outfits: [{ id: '着物 #1' }] }] }];
  const route = resolveAvatarRoute(avatarHref('素体 A', '和風 / 青', '着物 #1'), data);
  assert.equal(route.notFound, false);
  assert.equal(route.outfit.id, '着物 #1');
});

test('all configured content resolves to distinct links and existing gallery photos', () => {
  const photoIds = new Set(mediaLibrary(content, gallery).map((photo) => photo.id));
  const hrefs = new Set();
  function check(item, ids) {
    assert.ok(photoIds.has(item.photo), `Missing gallery photo: ${item.photo}`);
    const href = avatarHref(...ids);
    assert.ok(!hrefs.has(href), `Duplicate link: ${href}`);
    hrefs.add(href);
    assert.equal(resolveAvatarRoute(href, configuredAvatars).notFound, false, href);
  }
  for (const avatar of configuredAvatars) {
    check(avatar, [avatar.id]);
    for (const theme of avatar.themes) {
      check(theme, [avatar.id, theme.id]);
      for (const outfit of theme.outfits) check(outfit, [avatar.id, theme.id, outfit.id]);
    }
  }
});
