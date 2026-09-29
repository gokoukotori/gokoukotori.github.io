import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, readdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createServer } from 'node:http';
import sharp from 'sharp';
import { CmsStore } from '../../cms/server/store.mjs';
import { checkRequest, createCmsApi } from '../../cms/server/api.mjs';
import { uploadPending } from '../../cms/server/r2.mjs';
import { validateContent, photoUses } from '../../cms/shared/model.mjs';
import { mediaLibrary, publicGallery } from '../../site/src/lib/media-library.js';
import { DEFAULT_GALLERY_IMAGE_BASE_URL, galleryImageUrl } from '../../site/src/lib/gallery-media.js';

const root = fileURLToPath(new URL('../../', import.meta.url));
const liveContent = JSON.parse(await readFile(new URL('../../site/src/data/content.json', import.meta.url)));
const original = JSON.parse(await readFile(new URL('../../site/src/data/gallery.json', import.meta.url)));
const baseline = {version:1,isSampleContent:false,media:[],photoSettings:{},avatars:[{id:'base',name:'素体',photo:original[0].id,caption:'',description:'',themes:[{id:'theme',name:'テーマ',label:'',description:'',photo:original[0].id,outfits:[{id:'outfit',name:'衣装',description:'',photo:original[0].id,credits:[],galleryPhotoIds:[original[0].id]}]}]}]};
async function fixture(t) {
  const base = path.join(root, 'output/cms-tests');
  await mkdir(base, { recursive:true });
  const dir = await mkdtemp(path.join(base,'case-'));
  await mkdir(path.join(dir,'site/src/data'),{recursive:true});
  await writeFile(path.join(dir,'site/src/data/content.json'),JSON.stringify(baseline));
  await writeFile(path.join(dir,'site/src/data/gallery.json'),JSON.stringify(original));
  t.after(async()=>{assert.ok(path.resolve(dir).startsWith(path.resolve(base)+path.sep));await rm(dir,{recursive:true,force:true});});
  return new CmsStore(dir);
}
const image = () => sharp({create:{width:1200,height:600,channels:3,background:'#448855'}}).png().toBuffer();

test('additional main images save in order independently of related photos, three views, and gallery listing', async t => {
  const store = await fixture(t);
  let state = await store.read();
  const outfit = state.content.avatars[0].themes[0].outfits[0];
  outfit.threeView = [{src:'/three.webp',caption:'三面図'}];
  outfit.additionalPhotoIds = [original[2].id, original[1].id];
  state.content.photoSettings[original[2].id] = {listed:false};
  state = await store.save(state.content, state.revision);
  const saved = state.content.avatars[0].themes[0].outfits[0];
  assert.deepEqual(saved.additionalPhotoIds, [original[2].id,original[1].id]);
  assert.deepEqual(saved.galleryPhotoIds, baseline.avatars[0].themes[0].outfits[0].galleryPhotoIds);
  assert.deepEqual(saved.threeView, outfit.threeView);
  assert.ok(!publicGallery(state.content, original).some(photo => photo.id === original[2].id));
  assert.ok(photoUses(state.content, original[2].id).some(use => use.endsWith('の追加メイン画像')));
  saved.additionalPhotoIds.reverse();
  state = await store.save(state.content, state.revision);
  assert.deepEqual(state.content.avatars[0].themes[0].outfits[0].additionalPhotoIds, [original[1].id,original[2].id]);
  state.content.avatars[0].themes[0].outfits[0].additionalPhotoIds = [];
  await store.save(state.content, state.revision);
  assert.deepEqual((await store.read()).content.avatars[0].themes[0].outfits[0].additionalPhotoIds, []);
});

test('invalid or duplicate additional main images are rejected without saving', async t => {
  const store = await fixture(t), state = await store.read();
  for (const additionalPhotoIds of [null, false, 'photo', ['missing'], [original[1].id,original[1].id]]) {
    const doc = structuredClone(state.content);
    doc.avatars[0].themes[0].outfits[0].additionalPhotoIds = additionalPhotoIds;
    await assert.rejects(store.save(doc, state.revision), /追加メイン画像/);
    assert.equal((await store.read()).revision, state.revision);
  }
});

test('an unlisted pending image used only as an additional main image cannot be canceled', async t => {
  const store = await fixture(t), before = await store.read();
  let state = await store.importImage(await image(), 'main.png', '2026-09-27T00:00:00Z', before.revision);
  const photo = state.content.media[0];
  state.content.avatars[0].themes[0].outfits[0].additionalPhotoIds = [photo.id];
  state = await store.save(state.content, state.revision);
  await assert.rejects(store.removePendingImage(photo.id, state.revision), /使用中/);
  assert.equal((await store.read()).revision, state.revision);
  assert.ok((await readFile(path.join(store.root, '.cms/media', photo.displayKey))).length);
  state.content.avatars[0].themes[0].outfits[0].additionalPhotoIds = [];
  state = await store.save(state.content, state.revision);
  const removed = await store.removePendingImage(photo.id, state.revision);
  assert.equal(removed.content.media.length, 0);
});

test('multiple three views persist in order, validate every entry, and protect referenced photos', async t => {
  const store = await fixture(t), state = await store.read();
  const outfit = state.content.avatars[0].themes[0].outfits[0];
  const views = [
    { src:'/images/first.webp', caption:'最初' },
    { src:galleryImageUrl(original[1].displayKey, DEFAULT_GALLERY_IMAGE_BASE_URL), caption:'二枚目' },
  ];
  outfit.threeView = views;
  await store.save(state.content, state.revision);
  assert.deepEqual((await store.read()).content.avatars[0].themes[0].outfits[0].threeView, views);
  assert.ok(photoUses(state.content, original[1].id).some(use => use.endsWith('の三面図')));
  outfit.threeView = [views[0], {src:'javascript:alert(1)'}];
  assert.throws(() => validateContent(state.content, original), /三面図のURL/);
  outfit.threeView = [views[0], null];
  assert.throws(() => validateContent(state.content, original), /三面図の形式/);
  outfit.threeView = [];
  validateContent(state.content, original);
  outfit.threeView = views[0];
  validateContent(state.content, original);
});

test('CMS seed preserves valid existing avatars and all original gallery photos',()=>{
  validateContent(liveContent,original);
  validateContent(baseline,original);
  assert.equal(publicGallery(baseline,original).length,original.length);
  assert.equal(mediaLibrary(baseline,original)[0].id,original[0].id);
  assert.ok(photoUses(baseline,baseline.avatars[0].photo).length);
});
test('avatar source URL is optional and accepts only HTTP(S) distribution links',()=>{
  validateContent(baseline,original);
  for (const sourceUrl of ['', 'https://booth.pm/ja/items/6106863', 'http://example.com/avatar?lang=ja#download']) {
    const doc=structuredClone(baseline);doc.avatars[0].sourceUrl=sourceUrl;
    assert.doesNotThrow(()=>validateContent(doc,original));
  }
  for (const sourceUrl of ['javascript:alert(1)', 'data:text/html,test', '/avatars/', '//example.com/avatar', 'https://', 'https://example.com/a b', 'https://example.com/\\test', 'not a url', null, false, 123]) {
    const doc=structuredClone(baseline);doc.avatars[0].sourceUrl=sourceUrl;
    assert.throws(()=>validateContent(doc,original),/URL/);
  }
});

test('avatar source URL can be saved, changed and cleared without changing other content',async t=>{
  const store=await fixture(t);let state=await store.read();
  for (const sourceUrl of ['https://booth.pm/ja/items/6106863', 'https://example.com/avatar', '']) {
    const edited=structuredClone(state.content);edited.avatars[0].sourceUrl=sourceUrl;
    state=await store.save(edited,state.revision);
    const persisted=await store.read();
    assert.equal(persisted.content.avatars[0].sourceUrl,sourceUrl);
    const withoutUrl=structuredClone(persisted.content);delete withoutUrl.avatars[0].sourceUrl;
    assert.deepEqual(withoutUrl,baseline);
  }
});

test('theme credits can be added, edited and removed independently of outfit credits',async t=>{
  const store=await fixture(t);let state=await store.read();
  for (const credits of [
    [{category:'髪型',name:'テーマ用ヘア',url:'https://example.com/hair'}],
    [{category:'メイク',name:'変更した商品',url:''},{category:'小物',name:'追加商品',url:'https://example.com/item'}],
    [],
  ]) {
    const edited=structuredClone(state.content);edited.avatars[0].themes[0].credits=credits;
    state=await store.save(edited,state.revision);
    const persisted=await store.read();
    assert.deepEqual(persisted.content.avatars[0].themes[0].credits,credits);
    const withoutCredits=structuredClone(persisted.content);delete withoutCredits.avatars[0].themes[0].credits;
    assert.deepEqual(withoutCredits,baseline);
  }
});

test('invalid theme credits cannot overwrite saved content',async t=>{
  const store=await fixture(t),state=await store.read();
  for (const credits of [null,{},[null],[{category:'髪型',name:'商品',url:'javascript:alert(1)'}],[{category:'',name:'商品',url:''}],[{category:'髪型',name:' ',url:''}],[{category:'髪型',name:'商品',url:'',unexpected:true}]]) {
    const edited=structuredClone(state.content);edited.avatars[0].themes[0].credits=credits;
    await assert.rejects(store.save(edited,state.revision));
    assert.equal((await store.read()).revision,state.revision);
  }
});

test('theme credits are valid without any outfits',()=>{
  const edited=structuredClone(baseline);
  edited.avatars[0].themes[0].outfits=[];
  edited.avatars[0].themes[0].credits=[{category:'髪型',name:'テーマ用ヘア',url:''}];
  validateContent(edited,original);
});

test('save backs up the prior document and rejects a stale revision without overwriting',async t=>{
  const store=await fixture(t),before=await store.read();
  const edited=structuredClone(before.content);edited.avatars[0].name='編集テスト';
  const saved=await store.save(edited,before.revision);
  assert.equal(saved.content.avatars[0].name,'編集テスト');
  await assert.rejects(store.save(before.content,before.revision),error=>error.status===409);
  const backups=await readdir(path.join(store.root,'.cms/backups'));
  assert.equal(JSON.parse(await readFile(path.join(store.root,'.cms/backups',backups[0]))).avatars[0].name,before.content.avatars[0].name);
  assert.equal((await store.read()).content.avatars[0].name,'編集テスト');
});
test('successful saves retain the latest ten backups and leave unrelated files untouched',async t=>{
  const store=await fixture(t);let state=await store.read();
  const directory=path.join(store.root,'.cms/backups');
  await mkdir(directory,{recursive:true});
  await writeFile(path.join(directory,'notes.json'),'keep');
  for(let i=1;i<=13;i++) {
    const content=structuredClone(state.content);content.avatars[0].name=`revision-${i}`;
    state=await store.save(content,state.revision);
  }
  const names=(await readdir(directory)).filter(name=>name!=='notes.json');
  assert.equal(names.length,10);
  const savedNames=await Promise.all(names.map(async name=>JSON.parse(await readFile(path.join(directory,name))).avatars[0].name));
  assert.deepEqual(savedNames.sort(),Array.from({length:10},(_,i)=>`revision-${i+3}`).sort());
  assert.equal(await readFile(path.join(directory,'notes.json'),'utf8'),'keep');
  assert.equal((await store.read()).content.avatars[0].name,'revision-13');
});

test('backup cleanup failure does not turn a committed save into a failure',async t=>{
  const store=await fixture(t),state=await store.read();
  store.pruneBackups=async()=>{throw new Error('simulated cleanup failure');};
  const warning=t.mock.method(console,'warn',()=>{});
  const content=structuredClone(state.content);content.avatars[0].name='saved';
  const saved=await store.save(content,state.revision);
  assert.equal(saved.content.avatars[0].name,'saved');
  assert.equal((await store.read()).revision,saved.revision);
  assert.equal(warning.mock.callCount(),1);
});

test('invalid references, URLs and unlisting a related photo cannot be saved',async t=>{
  const store=await fixture(t),state=await store.read();
  for(const mutate of [doc=>doc.avatars[0].themes[0].outfits[0].credits.push({category:'衣装',name:'テスト',url:'javascript:alert(1)'}),doc=>doc.site={name:'対象外'},doc=>doc.avatars[0].photo='missing',doc=>doc.photoSettings[doc.avatars[0].themes[0].outfits[0].galleryPhotoIds[0]]={listed:false}]) {
    const doc=structuredClone(state.content);mutate(doc);
    await assert.rejects(store.save(doc,state.revision));
    assert.equal((await store.read()).revision,state.revision);
  }
});
test('image import creates local immutable derivatives, detects duplicates and never publishes',async t=>{
  const store=await fixture(t),before=await store.read(),buffer=await image();
  const saved=await store.importImage(buffer,'photo.png','2026-09-27T00:00:00Z',before.revision);
  const photo=saved.content.media.at(-1);
  assert.equal(photo.uploaded,false);assert.equal(saved.library.find(item=>item.id===photo.id).listed,false);
  for(const key of [photo.displayKey,photo.thumbnailKey]) {
    const meta=await sharp(await readFile(path.join(store.root,'.cms/media',key))).metadata();
    assert.equal(meta.format,'webp');assert.ok(meta.icc);assert.equal(meta.exif,undefined);
    if(key.startsWith('thumbnails/')) assert.equal(meta.width,640);
  }
  const duplicate=await store.importImage(buffer,'again.png','2026-09-27T00:00:00Z',saved.revision);
  assert.equal(duplicate.duplicate,true);assert.equal(duplicate.revision,saved.revision);
  await assert.rejects(store.importImage(Buffer.from('not an image'),'bad.png','2026-09-27T00:00:00Z',saved.revision));
  assert.equal((await store.read()).revision,saved.revision);
  const forged=structuredClone(saved.content);forged.media.at(-1).uploaded=true;
  await assert.rejects(store.save(forged,saved.revision));
});
test('R2 uploads verify both objects and retry without replacing an existing object',async t=>{
  const store=await fixture(t),initial=await store.read();
  const saved=await store.importImage(await image(),'photo.png','2026-09-27T00:00:00Z',initial.revision);
  const id=saved.content.media.at(-1).id,objects=new Map();let writes=0;
  const storage={head:async key=>objects.get(key),put:async(key,body,hash)=>{writes++;objects.set(key,{ContentLength:body.length,Metadata:{sha256:hash}});}};
  const result=await uploadPending(store,saved.revision,[id],storage);
  assert.equal(writes,2);assert.deepEqual(result.failures,[]);assert.equal(result.content.media.at(-1).uploaded,true);
  assert.deepEqual([...objects.keys()],['media/display/photo.webp','media/thumbnails/photo.webp']);
});

test('imports reject conflicting output names and unsafe filenames without changing data',async t=>{
  const store=await fixture(t),before=await store.read();
  const saved=await store.importImage(await image(),'写真.png','2026-09-27T00:00:00Z',before.revision);
  const different=await sharp({create:{width:20,height:10,channels:3,background:'#ff0000'}}).png().toBuffer();
  for(const name of ['写真.png','写真.jpg']) {
    await assert.rejects(store.importImage(different,name,'2026-09-27T00:00:00Z',saved.revision),/同じ保存名/);
  }
  for(const name of ['../photo.png','folder\\photo.png','bad\u0000.png','x'.repeat(256)]) {
    await assert.rejects(store.importImage(different,name,'2026-09-27T00:00:00Z',saved.revision),/元ファイル名/);
  }
  assert.equal((await store.read()).revision,saved.revision);
});

for (const multiple of [false, true]) test(`named R2 keys update ${multiple ? 'multiple' : 'legacy'} three-view URLs while local media remains readable`,async t=>{
  const store=await fixture(t),before=await store.read();
  let state=await store.importImage(await image(),'しなの #1%.png','2026-09-27T00:00:00Z',before.revision);
  const photo=state.content.media[0];
  state.content.avatars[0].themes[0].outfits[0].threeView={src:galleryImageUrl(photo.displayKey,DEFAULT_GALLERY_IMAGE_BASE_URL)};
  if (multiple) state.content.avatars[0].themes[0].outfits[0].threeView = [
    {src:'/images/unrelated.webp',caption:'保持'},
    state.content.avatars[0].themes[0].outfits[0].threeView,
    {src:galleryImageUrl(photo.displayKey,DEFAULT_GALLERY_IMAGE_BASE_URL),caption:'別の説明'},
  ];
  state=await store.save(state.content,state.revision);
  const objects=new Map();
  const storage={head:async key=>objects.get(key),put:async(key,bytes,hash)=>objects.set(key,{ContentLength:bytes.length,Metadata:{sha256:hash}})};
  const uploaded=await uploadPending(store,state.revision,[photo.id],storage);
  assert.deepEqual(uploaded.failures,[]);
  assert.deepEqual([...objects.keys()],['media/display/しなの #1%.webp','media/thumbnails/しなの #1%.webp']);
  assert.equal(uploaded.content.media[0].originalName,'しなの #1%.png');
  const newKey=uploaded.content.media[0].displayKey;
  const savedViews = uploaded.content.avatars[0].themes[0].outfits[0].threeView;
  if (multiple) {
    assert.deepEqual(savedViews[0],{src:'/images/unrelated.webp',caption:'保持'});
    assert.equal(savedViews[1].src,galleryImageUrl(newKey,DEFAULT_GALLERY_IMAGE_BASE_URL));
    assert.deepEqual(savedViews[2],{src:galleryImageUrl(newKey,DEFAULT_GALLERY_IMAGE_BASE_URL),caption:'別の説明'});
  } else assert.equal(savedViews.src,galleryImageUrl(newKey,DEFAULT_GALLERY_IMAGE_BASE_URL));
  assert.ok(photoUses(uploaded.content,photo.id).some(use=>use.endsWith('の三面図')));
  validateContent(uploaded.content,original);
  let handler;
  const server=createServer((req,res)=>handler(req,res,()=>{res.writeHead(404);res.end();}));
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const origin=`http://127.0.0.1:${server.address().port}`;handler=createCmsApi(store.root,origin);
  for(const key of [newKey,uploaded.content.media[0].thumbnailKey]) {
    const response=await fetch(galleryImageUrl(key,`${origin}/__cms/media`));
    assert.equal(response.status,200);
    assert.equal(response.headers.get('content-type'),'image/webp');
    const bytes=Buffer.from(await response.arrayBuffer());
    assert.equal((await sharp(bytes).metadata()).format,'webp');
  }
});

test('thumbnail name conflicts are detected before writing either R2 object',async t=>{
  const store=await fixture(t),before=await store.read();
  const saved=await store.importImage(await image(),'photo.png','2026-09-27T00:00:00Z',before.revision);
  const result=await uploadPending(store,saved.revision,[saved.content.media[0].id],{
    head:async key=>key.startsWith('media/thumbnails/')?{ContentLength:1,Metadata:{sha256:'different'}}:null,
    put:async()=>assert.fail('must not upload either object on a name conflict'),
  });
  assert.equal(result.failures.length,1);
  assert.equal(result.revision,saved.revision);
  assert.deepEqual(result.content.media,saved.content.media);
});

test('named uploads retry partial failures and preserve already published hash URLs',async t=>{
  const store=await fixture(t),before=await store.read();
  let state=await store.importImage(await image(),'published.png','2026-09-27T00:00:00Z',before.revision);
  state.content.media[0].uploaded=true;
  state=await store.write(state.content,state.revision);
  const published=structuredClone(state.content.media[0]);
  const bytes=await sharp({create:{width:12,height:24,channels:3,background:'#ffee00'}}).png().toBuffer();
  state=await store.importImage(bytes,'new.png','2026-09-27T00:00:00Z',state.revision);
  const photo=state.content.media[1],objects=new Map();let fail=true,writes=0;
  const storage={head:async key=>objects.get(key),put:async(key,body,hash)=>{
    if(fail&&key.startsWith('media/thumbnails/'))throw new Error('simulated network failure');
    writes++;objects.set(key,{ContentLength:body.length,Metadata:{sha256:hash}});
  }};
  const failed=await uploadPending(store,state.revision,[photo.id],storage);
  assert.equal(failed.failures.length,1);
  assert.equal(failed.revision,state.revision);
  assert.deepEqual(failed.content.media,state.content.media);
  fail=false;
  const retried=await uploadPending(store,failed.revision,[photo.id],storage);
  assert.deepEqual(retried.failures,[]);
  assert.equal(writes,2);
  assert.equal(retried.content.media[1].displayKey,'display/new.webp');
  assert.deepEqual(retried.content.media[0],published);
});
test('R2 conflicts leave the photo pending and never overwrite remote content',async t=>{
  const store=await fixture(t),initial=await store.read();
  const saved=await store.importImage(await image(),'photo.png','2026-09-27T00:00:00Z',initial.revision);
  const result=await uploadPending(store,saved.revision,[saved.content.media.at(-1).id],{head:async()=>({ContentLength:1,Metadata:{sha256:'different'}}),put:async()=>assert.fail('must not overwrite')});
  assert.equal(result.failures.length,1);assert.equal(result.content.media.at(-1).uploaded,false);assert.equal(result.revision,saved.revision);
});
test('canceling an unused local import deletes its files and allows same-name reimport',async t=>{
  const store=await fixture(t),before=await store.read();
  const imported=await store.importImage(await image(),'image.png','2026-09-27T00:00:00Z',before.revision);
  const photo=imported.content.media[0];
  const files=[photo.displayKey,photo.thumbnailKey,`originals/${photo.id}.png`].map(key=>path.join(store.root,'.cms/media',key));
  const used=structuredClone(imported.content);used.avatars[0].photo=photo.id;
  const referenced=await store.save(used,imported.revision);
  await assert.rejects(store.removePendingImage(photo.id,referenced.revision));
  for(const file of files) assert.ok((await readFile(file)).length);
  used.avatars[0].photo=original[0].id;
  const unused=await store.save(used,referenced.revision);
  await assert.rejects(store.removePendingImage(photo.id,referenced.revision),error=>error.status===409);
  for(const file of files) assert.ok((await readFile(file)).length);
  const removed=await store.removePendingImage(photo.id,unused.revision);
  assert.equal(removed.content.media.length,0);
  for(const file of files) await assert.rejects(readFile(file),error=>error.code==='ENOENT');
  const restored=await store.importImage(await image(),'image.png','2026-09-27T00:00:00Z',removed.revision);
  assert.equal(restored.duplicate,undefined);
  assert.equal(restored.content.media[0].id,photo.id);
  for(const file of files) assert.ok((await readFile(file)).length);
});

test('a different image can reuse a deleted filename without deleting other images',async t=>{
  const store=await fixture(t),before=await store.read();
  const first=await store.importImage(await image(),'same.png','2026-09-27T00:00:00Z',before.revision);
  const otherBytes=await sharp({create:{width:10,height:20,channels:3,background:'#cc2244'}}).png().toBuffer();
  const withOther=await store.importImage(otherBytes,'other.png','2026-09-27T00:00:00Z',first.revision);
  const other=withOther.content.media[1];
  const removed=await store.removePendingImage(first.content.media[0].id,withOther.revision);
  for(const key of [other.displayKey,other.thumbnailKey,`originals/${other.id}.png`]) assert.ok((await readFile(path.join(store.root,'.cms/media',key))).length);
  const replacementBytes=await sharp({create:{width:30,height:40,channels:3,background:'#1122cc'}}).png().toBuffer();
  const replaced=await store.importImage(replacementBytes,'same.png','2026-09-27T00:00:00Z',removed.revision);
  assert.equal(replaced.duplicate,undefined);
  assert.equal(replaced.content.media.at(-1).originalName,'same.png');
  assert.notEqual(replaced.content.media.at(-1).id,first.content.media[0].id);
});

test('failed cancellation restores image files and preserves registration',async t=>{
  const store=await fixture(t),before=await store.read();
  const imported=await store.importImage(await image(),'image.png','2026-09-27T00:00:00Z',before.revision);
  const photo=imported.content.media[0];
  const files=[photo.displayKey,photo.thumbnailKey,`originals/${photo.id}.png`].map(key=>path.join(store.root,'.cms/media',key));
  const bytes=await Promise.all(files.map(file=>readFile(file)));
  store.write=async()=>{throw new Error('simulated save failure');};
  await assert.rejects(store.removePendingImage(photo.id,imported.revision),/simulated save failure/);
  assert.equal((await store.read()).revision,imported.revision);
  for(let i=0;i<files.length;i++) assert.deepEqual(await readFile(files[i]),bytes[i]);
});

test('cancellation deletes JPEG and WebP originals and tolerates missing derivatives',async t=>{
  const store=await fixture(t);let state=await store.read();
  for(const format of ['jpeg','webp']) {
    const buffer=await sharp(await image()).toFormat(format).toBuffer();
    state=await store.importImage(buffer,`image.${format}`,'2026-09-27T00:00:00Z',state.revision);
    const photo=state.content.media[0];
    const thumbnail=path.join(store.root,'.cms/media',photo.thumbnailKey);
    await rm(thumbnail);
    state=await store.removePendingImage(photo.id,state.revision);
    assert.equal(state.content.media.length,0);
    for(const key of [photo.displayKey,photo.thumbnailKey,`originals/${photo.id}.${format}`]) {
      await assert.rejects(readFile(path.join(store.root,'.cms/media',key)),error=>error.code==='ENOENT');
    }
  }
});
test('CMS API protects local writes from other origins and missing session tokens',()=>{
  const origin='http://127.0.0.1:5174';
  const request={headers:{host:'127.0.0.1:5174',origin,'x-cms-token':'correct'}};
  checkRequest(request,origin,'correct',true);
  for(const headers of [{host:'evil.test',origin,'x-cms-token':'correct'},{host:'127.0.0.1:5174',origin:'https://evil.test','x-cms-token':'correct'},{host:'127.0.0.1:5174',origin}]) assert.throws(()=>checkRequest({headers},origin,'correct',true));
});
test('HTTP save works with session token; image traversal and cross-origin writes are rejected',async t=>{
  const store=await fixture(t);let handler;
  const server=createServer((req,res)=>handler(req,res,()=>{res.writeHead(404);res.end();}));
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const origin=`http://127.0.0.1:${server.address().port}`;handler=createCmsApi(store.root,origin);
  const state=await (await fetch(`${origin}/__cms/state`)).json();
  const headers={'Content-Type':'application/json',Origin:origin,'X-CMS-Token':state.token};
  const response=await fetch(`${origin}/__cms/content`,{method:'POST',headers,body:JSON.stringify({content:state.content,revision:state.revision})});
  assert.equal(response.status,200);
  assert.equal((await fetch(`${origin}/__cms/content`,{method:'POST',headers:{...headers,Origin:'https://evil.test'},body:'{}'})).status,403);
  assert.equal((await fetch(`${origin}/__cms/media/display%2F..%2F..%2F.env.r2.local`)).status,400);
});
