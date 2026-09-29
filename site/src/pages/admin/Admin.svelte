<script>
  import { onMount } from 'svelte';
  import { Alert, Button, Checkbox, Fileupload, Input, Label, Modal, Textarea } from 'flowbite-svelte';
  import { mediaLibrary } from '../../lib/media-library.js';
  import { threeViews } from '../../lib/three-views.js';
  import { photoUses } from '../../../../cms/shared/model.mjs';
  import { DEFAULT_GALLERY_IMAGE_BASE_URL, galleryImageUrl } from '../../lib/gallery-media.js';

  let doc, revision = '', token = '', originalPhotos = [], configured = false;
  let tab = 'avatars', dirty = false, busy = false, error = '', notice = '';
  let avatarId = '', themeId = '', outfitId = '', kind = 'avatar';
  let search = '', page = 0, selectedMediaId = '', failedUploads = [];
  let pickerOpen = false, pickerMode = '', pickerSearch = '', pickerPage = 0, dragIndex = null;
  let threeIndex = null;
  $: library = doc ? mediaLibrary(doc, originalPhotos) : [];
  $: mediaById = new Map(library.map(photo => [photo.id, photo]));
  $: avatar = doc?.avatars.find(item => item.id === avatarId);
  $: theme = avatar?.themes.find(item => item.id === themeId);
  $: outfit = theme?.outfits.find(item => item.id === outfitId);
  $: selected = kind === 'outfit' ? outfit : kind === 'theme' ? theme : avatar;
  $: selectedMedia = mediaById.get(selectedMediaId);
  $: filtered = library.filter(photo => `${photo.id} ${photo.originalName || ''}`.toLowerCase().includes(search.toLowerCase()));
  $: pickerPhotos = library.filter(photo => (pickerMode !== 'related' || photo.listed) && `${photo.id} ${photo.originalName || ''}`.toLowerCase().includes(pickerSearch.toLowerCase()));
  $: pickerMultiple = pickerMode === 'related' || pickerMode === 'main';
  $: pickerSelection = (pickerMode === 'main' ? outfit?.additionalPhotoIds : outfit?.galleryPhotoIds) || [];
  $: pickerTitle = pickerMode === 'related' ? '関連フォトを選ぶ' : pickerMode === 'main' ? '追加メイン画像を選ぶ' : '写真を選ぶ';
  $: pending = doc?.media.filter(photo => !photo.uploaded) || [];
  $: previewHref = avatar ? `/avatars/#/${[avatar.id, ...(theme ? [theme.id] : []), ...(outfit ? [outfit.id] : [])].join('/')}` : '/avatars/';
  const thumb = photo => galleryImageUrl(photo.thumbnailKey, '/__cms/media');
  const full = photo => galleryImageUrl(photo.displayKey, DEFAULT_GALLERY_IMAGE_BASE_URL);
  const changed = () => { dirty = true; notice = ''; };

  async function api(endpoint, body, extra = {}) {
    const response = await fetch(`/__cms/${endpoint}`, { ...(body === undefined ? {} : { method:'POST', body:JSON.stringify(body), headers:{'Content-Type':'application/json','X-CMS-Token':token} }), ...extra });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || '処理に失敗しました。');
    return result;
  }
  function accept(state) {
    doc = state.content; revision = state.revision; originalPhotos = state.originalPhotos;
    if (state.token) token = state.token;
    if (state.r2Configured !== undefined) configured = state.r2Configured;
    dirty = false;
    if (!doc.avatars.some(item => item.id === avatarId)) {
      avatarId = doc.avatars[0]?.id || ''; themeId = ''; outfitId = ''; kind = 'avatar';
    }
  }
  async function run(action) {
    if (busy) return;
    busy = true; error = '';
    try { await action(); } catch (problem) { error = problem.message; } finally { busy = false; }
  }
  async function load() {
    if (dirty && !confirm('未保存の編集を破棄して再読み込みしますか？')) return;
    await run(async () => { accept(await api('state')); notice = ''; });
  }
  async function save() {
    await run(async () => { accept(await api('content', { content:doc, revision })); notice = 'ローカルに保存しました。公開サイトにはまだ反映されません。'; });
  }
  function select(type, base, collection, look) {
    kind = type; avatarId = base.id; themeId = collection?.id || ''; outfitId = look?.id || '';
  }
  function add(type) {
    const item = { id:`${type}-${crypto.randomUUID().slice(0,8)}`, name:type === 'avatar' ? '新しい素体' : type === 'theme' ? '新しいテーマ' : '新しいバリエーション', photo:library[0]?.id || '', description:'' };
    if (type === 'avatar') { item.caption = ''; item.themes = []; doc.avatars.push(item); select(type,item); }
    else if (type === 'theme') { item.label = ''; item.credits = []; item.outfits = []; avatar.themes.push(item); select(type,avatar,item); }
    else { item.credits = []; theme.outfits.push(item); select(type,avatar,theme,item); }
    doc = { ...doc }; changed();
  }
  function removeSelected() {
    if (!confirm(`「${selected.name}」を削除しますか？配下のテーマ・バリエーションも削除されます。画像ファイルは残ります。`)) return;
    if (kind === 'avatar') { doc.avatars = doc.avatars.filter(item => item.id !== avatarId); avatarId = doc.avatars[0]?.id || ''; }
    else if (kind === 'theme') avatar.themes = avatar.themes.filter(item => item.id !== themeId);
    else theme.outfits = theme.outfits.filter(item => item.id !== outfitId);
    kind = 'avatar'; themeId = ''; outfitId = ''; doc = { ...doc }; changed();
  }
  function reorder(items, from, to) {
    if (from === null || to < 0 || to >= items.length || from === to) return;
    items.splice(to, 0, items.splice(from, 1)[0]); doc = { ...doc }; changed();
  }
  function moveSelected(offset) {
    const items = kind === 'avatar' ? doc.avatars : kind === 'theme' ? avatar.themes : theme.outfits;
    const index = items.findIndex(item => item.id === selected.id); reorder(items,index,index + offset);
  }
  function openPicker(mode, index = null) { pickerMode = mode; threeIndex = index; pickerSearch = ''; pickerPage = 0; pickerOpen = true; }
  function editThree(index, key, value) {
    const views = [...threeViews(outfit.threeView)];
    views[index] = { ...views[index], [key]:value };
    outfit.threeView = views; doc = { ...doc }; changed();
  }
  function removeThree(index) {
    outfit.threeView = threeViews(outfit.threeView).filter((_, i) => i !== index);
    doc = { ...doc }; changed();
  }
  function choose(photo) {
    if (pickerMultiple) {
      if (pickerMode === 'main' && photo.id === outfit.photo) return;
      const field = pickerMode === 'main' ? 'additionalPhotoIds' : 'galleryPhotoIds';
      const ids = outfit[field] || [];
      outfit[field] = ids.includes(photo.id) ? ids.filter(id => id !== photo.id) : [...ids,photo.id];
    } else {
      if (pickerMode === 'three') {
        const views = [...threeViews(outfit.threeView)];
        const index = threeIndex ?? views.length;
        views[index] = { ...views[index], src:full(photo) };
        outfit.threeView = views;
      }
      else {
        selected.photo = photo.id;
        if (kind === 'outfit' && outfit.additionalPhotoIds) outfit.additionalPhotoIds = outfit.additionalPhotoIds.filter(id => id !== photo.id);
      }
      pickerOpen = false;
    }
    doc = { ...doc }; changed();
  }
  function setPhotoSetting(id, key, value) {
    doc.photoSettings[id] = { ...doc.photoSettings[id], [key]:value }; doc = { ...doc }; changed();
  }
  async function importFiles(files) {
    if (dirty || busy) { error = '画像を追加する前に編集中の内容を保存してください。'; return; }
    const inputs = [...files]; failedUploads = [];
    await run(async () => {
      let completed = 0;
      for (const file of inputs) {
        notice = `画像を処理しています ${++completed} / ${inputs.length}：${file.name}`;
        try {
          const params = new URLSearchParams({ name:file.name, capturedAt:new Date(file.lastModified || Date.now()).toISOString() });
          const result = await api(`import?${params}`, undefined, { method:'POST', headers:{'Content-Type':'application/octet-stream','X-CMS-Token':token,'X-CMS-Revision':revision}, body:file });
          accept(result);
        } catch (problem) { failedUploads = [...failedUploads,{name:file.name,message:problem.message}]; }
      }
      notice = `${inputs.length - failedUploads.length} / ${inputs.length}件を取り込みました。新しい画像は初期状態ではギャラリー非掲載です。R2にはまだ送信していません。`;
    });
  }
  async function uploadR2() {
    if (!confirm(`${pending.length}枚の画像（表示用とサムネイル）をR2へアップロードします。サイトの公開は行いません。実行しますか？`)) return;
    await run(async () => {
      const result = await api('r2', { revision, ids:pending.map(photo => photo.id), confirm:true });
      accept(result); failedUploads = result.failures.map(item => ({name:item.id,message:item.message}));
      notice = `${result.succeeded.length}枚をR2へ保存しました。`;
    });
  }
  onMount(() => {
    load();
    const warn = event => { if (dirty || busy) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload',warn);
    return () => window.removeEventListener('beforeunload',warn);
  });
</script>

<svelte:head><title>Local CMS — アバター・ギャラリー管理</title></svelte:head>

<div class="cms-shell grid min-h-screen grid-cols-1 bg-gray-50 text-sm text-gray-900 dark:bg-gray-900 dark:text-gray-50 min-[801px]:grid-cols-[190px_minmax(0,1fr)] xl:grid-cols-[230px_minmax(0,1fr)]">
  <aside class="sidebar flex flex-col border-b border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800 min-[801px]:sticky min-[801px]:top-0 min-[801px]:h-screen min-[801px]:border-r min-[801px]:p-4 xl:px-5 xl:py-9">
    <a class="brand text-lg font-semibold tracking-wide min-[801px]:text-xl [&_span]:mt-2 [&_span]:hidden [&_span]:text-xs [&_span]:tracking-widest [&_span]:text-gray-500 min-[801px]:[&_span]:block" href="/cms/">ローカルCSM</a>
    <div class="local-badge my-7 hidden items-center gap-2 text-xs min-[801px]:flex text-gray-600 dark:text-gray-400 [&_i]:size-1.5 [&_i]:rounded-full [&_i]:bg-primary-500"><i></i> このPCだけで編集</div>
    <nav aria-label="管理メニュー" class="mt-4 flex flex-wrap gap-2 min-[801px]:mt-0 min-[801px]:grid">
      {#each [['avatars','01','アバター'],['media','02','ギャラリー画像'],['publish','03','プレビュー・公開']] as [key,num,label]}
        <Button color={tab === key ? 'primary' : 'alternative'} size="sm" class="justify-start gap-3 whitespace-normal text-left" aria-current={tab === key ? 'page' : undefined} onclick={() => tab = key}><span class="text-xs opacity-70">{num}</span>{label}</Button>
      {/each}
    </nav>
    <div class="sidebar-bottom mt-auto hidden text-sm leading-loose min-[801px]:block [&_small]:mt-3 [&_small]:block [&_small]:text-xs text-gray-600 dark:text-gray-400"><small>保存先はこのプロジェクトです。<br/>保存だけでは公開されません。</small></div>
  </aside>
  <main class="min-w-0">
    <header class="toolbar sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b bg-white/95 px-4 py-3 backdrop-blur-md min-[801px]:px-6 xl:px-9 dark:bg-gray-800/95 border-gray-200 dark:border-gray-700">
      <div><span data-unsaved={dirty} class="save-state text-xs text-gray-600 dark:text-gray-400 data-[unsaved=true]:text-amber-700 dark:data-[unsaved=true]:text-amber-300">{busy ? '処理中…' : dirty ? '● 未保存の変更' : '保存済み'}</span></div>
      <div class="actions flex flex-wrap items-center gap-2"><Button color="alternative" size="sm" disabled={busy} onclick={load}>再読み込み</Button><Button color="alternative" size="sm" href={tab === 'avatars' ? previewHref : '/gallery/'} target="_blank" rel="noopener noreferrer">プレビュー ↗</Button><Button color="primary" size="sm" disabled={busy || !dirty} onclick={save}>ローカル保存</Button></div>
    </header>
    <div class="messages space-y-3 px-4 empty:hidden min-[801px]:px-6 xl:px-9" aria-live="polite">{#if error}<Alert color="red" role="alert">{error}</Alert>{/if}{#if notice}<Alert color="green">{notice}</Alert>{/if}{#each failedUploads as failure}<Alert color="red">{failure.name}：{failure.message}</Alert>{/each}</div>
    {#if doc}
      <fieldset class="workspace m-0 min-w-0 border-0 px-4 py-5 min-[801px]:p-6 xl:p-9" disabled={busy}>
      {#if tab === 'avatars'}
        <div class="page-title mb-8 flex flex-wrap items-start justify-between gap-5 min-[801px]:items-center [&_p:not(.eyebrow)]:text-sm [&_p:not(.eyebrow)]:leading-relaxed [&_p:not(.eyebrow)]:text-gray-600 dark:[&_p:not(.eyebrow)]:text-gray-400"><div><p class="eyebrow mb-2 text-xs font-semibold tracking-widest text-primary-700 dark:text-primary-300">AVATAR COLLECTION</p><h1 class="mb-3 text-3xl font-semibold tracking-tight">アバターを編集</h1></div><Button color="primary" size="sm" onclick={() => add('avatar')}>＋ 素体を追加</Button></div>
        <Checkbox bind:checked={doc.isSampleContent} onchange={changed} classes={{ div: 'mb-4' }}>アバター紹介にサンプルの注記を表示する</Checkbox>
        <div class="editor-layout grid gap-5 min-[801px]:grid-cols-[190px_minmax(0,1fr)] xl:grid-cols-[230px_minmax(0,1fr)] xl:gap-6">
          <nav class="tree grid content-start gap-2 self-start [&_button]:w-full [&_button]:justify-start [&_button]:text-left [&_button]:whitespace-normal [&_button]:break-words [&_button[data-chosen=true]]:border-primary-500 [&_button[data-chosen=true]]:bg-primary-50 [&_button[data-chosen=true]]:text-primary-800 dark:[&_button[data-chosen=true]]:bg-primary-900 dark:[&_button[data-chosen=true]]:text-primary-200 [&_img]:h-12 [&_img]:w-10 [&_img]:shrink-0 [&_img]:rounded [&_img]:object-cover [&_strong]:min-w-0 [&_strong]:text-sm [&_small]:ml-auto" aria-label="素体・テーマ・バリエーション">
            {#each doc.avatars as base (base.id)}
              <Button color="alternative" size="sm" data-chosen={avatarId === base.id && kind === 'avatar'} onclick={() => select('avatar',base)}><img src={thumb(mediaById.get(base.photo))} alt=""/><strong class="ml-2">{base.name}</strong><small>{base.themes.length}</small></Button>
              {#if avatarId === base.id}
                <div class="branches ml-5 grid gap-1 border-l pl-4 border-gray-200 dark:border-gray-700">{#each base.themes as collection (collection.id)}
                  <Button color="alternative" size="sm" data-chosen={themeId === collection.id && kind === 'theme'} onclick={() => select('theme',base,collection)}>◇ {collection.name}</Button>
                  {#if themeId === collection.id}<div class="leaves my-1 grid gap-1 pl-3">{#each collection.outfits as look (look.id)}<Button color="alternative" size="sm" data-chosen={outfitId === look.id} onclick={() => select('outfit',base,collection,look)}>{look.name}</Button>{/each}<Button color="alternative" size="sm" class="add-link text-primary-700 dark:text-primary-300" onclick={() => add('outfit')}>＋ バリエーションを追加</Button></div>{/if}
                {/each}<Button color="alternative" size="sm" class="add-link text-primary-700 dark:text-primary-300" onclick={() => { select('avatar',base); add('theme'); }}>＋ テーマを追加</Button></div>
              {/if}
            {/each}
          </nav>
          <section class="edit-card min-w-0 space-y-4 rounded-lg border bg-white p-5 shadow-sm xl:p-7 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            {#if selected}
              <div class="section-top mb-5 flex flex-wrap items-center justify-between gap-3 [&_.eyebrow]:mb-0"><p class="eyebrow mb-2 text-xs font-semibold tracking-widest text-primary-700 dark:text-primary-300">{kind === 'avatar' ? '素体' : kind === 'theme' ? `${avatar.name} / 改変テーマ` : `${avatar.name} / ${theme.name} / バリエーション`}</p><div class="actions flex flex-wrap items-center gap-2"><Button color="alternative" size="sm" aria-label="表示順を前へ" onclick={() => moveSelected(-1)}>↑</Button><Button color="alternative" size="sm" aria-label="表示順を後ろへ" onclick={() => moveSelected(1)}>↓</Button><Button color="red" outline size="sm" onclick={removeSelected}>削除</Button></div></div>
              <div class="identity grid grid-cols-[100px_minmax(0,1fr)] gap-4 min-[801px]:grid-cols-[120px_minmax(0,1fr)] xl:grid-cols-[160px_minmax(0,1fr)] xl:gap-6 max-[420px]:grid-cols-1"><Button color="alternative" size="sm" class="cover-picker block self-start overflow-hidden p-0 [&_img]:block [&_img]:aspect-[3/4] [&_img]:w-full [&_img]:object-cover [&_span]:block [&_span]:p-2 [&_span]:text-xs max-[420px]:max-w-40" onclick={() => openPicker('cover')}><img src={thumb(mediaById.get(selected.photo))} alt="代表写真"/><span>写真を選択</span></Button><div class="fields min-w-0"><Label class="mb-4 grid gap-2 text-sm">名前<Input value={selected.name} oninput={event => { selected.name = event.currentTarget.value; doc = { ...doc }; changed(); }}/></Label>{#if kind === 'avatar'}<Label class="mb-4 grid gap-2 text-sm">短い紹介<Input bind:value={avatar.caption} oninput={changed}/></Label>{:else if kind === 'theme'}<Label class="mb-4 grid gap-2 text-sm">英字見出し<Input bind:value={theme.label} oninput={changed} placeholder="EVERYDAY"/></Label>{/if}<Label class="mb-4 grid gap-2 text-sm">紹介・コンセプト<Textarea class="w-full min-w-0 resize-y leading-relaxed" rows="5" bind:value={selected.description} oninput={changed}></Textarea></Label></div></div>
              {#if kind === 'avatar'}
                <div>
                  <Label for="avatar-source-url" class="mb-2 block text-sm">URL</Label>
                  <Input id="avatar-source-url" type="url" value={avatar.sourceUrl || ''} placeholder="https://booth.pm/ja/items/6106863" aria-describedby="avatar-source-url-hint" oninput={event => { avatar.sourceUrl = event.currentTarget.value; doc = { ...doc }; changed(); }}/>
                  <p id="avatar-source-url-hint" class="mt-2 text-xs leading-relaxed text-gray-600 dark:text-gray-400">http:// または https:// で始まる配布ページのURL。空欄の場合は表示しません。</p>
                </div>
              {/if}
              {#if kind === 'outfit'}
                <section class="form-section mt-7 border-t border-gray-200 pt-6 dark:border-gray-700" aria-labelledby="main-photos-title">
                  <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
                    <h2 id="main-photos-title" class="text-lg font-semibold">追加メイン画像 <small class="text-xs font-normal text-gray-500">任意・複数枚</small></h2>
                    <Button color="alternative" size="sm" onclick={() => openPicker('main')}>画像を選ぶ</Button>
                  </div>
                  <p class="text-xs leading-relaxed text-gray-600 dark:text-gray-400">このバリエーションの大きな画像エリアで、代表写真に続けて表示します。複数枚になると下部のサムネイルから切り替えられます。ギャラリー非掲載の画像も選択できます。</p>
                  <div class="mt-4 flex flex-wrap gap-3">
                    <div class="w-32 overflow-hidden rounded border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-700">
                      <img class="size-32 object-contain" src={thumb(mediaById.get(outfit.photo))} alt="メイン画像 1（代表写真）" />
                      <p class="p-2 text-center text-xs text-gray-600 dark:text-gray-300">1 · 代表写真</p>
                    </div>
                    {#each outfit.additionalPhotoIds || [] as id,index (id)}
                      <div class="w-32 overflow-hidden rounded border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-700">
                        <img class="size-32 object-contain" src={thumb(mediaById.get(id))} alt={`メイン画像 ${index + 2}`} />
                        <p class="pt-2 text-center text-xs text-gray-600 dark:text-gray-300">{index + 2}</p>
                        <div class="flex justify-center gap-0.5 p-1">
                          <Button color="alternative" size="xs" aria-label={`メイン画像 ${index+2}を前へ`} disabled={index === 0} onclick={() => reorder(outfit.additionalPhotoIds,index,index-1)}>←</Button>
                          <Button color="alternative" size="xs" aria-label={`メイン画像 ${index+2}を後ろへ`} disabled={index === outfit.additionalPhotoIds.length-1} onclick={() => reorder(outfit.additionalPhotoIds,index,index+1)}>→</Button>
                          <Button color="alternative" size="xs" aria-label={`メイン画像 ${index+2}を解除`} onclick={() => {outfit.additionalPhotoIds=outfit.additionalPhotoIds.filter(value=>value!==id);doc={...doc};changed();}}>×</Button>
                        </div>
                      </div>
                    {/each}
                  </div>
                </section>
                <section class="form-section mt-7 border-t pt-6 border-gray-200 dark:border-gray-700"><div class="section-top mb-5 flex flex-wrap items-center justify-between gap-3 [&_.eyebrow]:mb-0"><h2 class="text-lg font-semibold [&_small]:ml-2 [&_small]:text-xs [&_small]:font-normal [&_small]:text-gray-500">関連フォト</h2><Button color="alternative" size="sm" onclick={() => openPicker('related')}>写真を選ぶ</Button></div><p class="hint text-xs leading-relaxed text-gray-600 dark:text-gray-400">ドラッグ、または左右ボタンで並べ替え。拡大表示もこの順番になります。</p>
                  <div class="related-strip mt-4 flex flex-wrap gap-3">{#each outfit.galleryPhotoIds || [] as id,index (id)}<div class="related-item w-32 overflow-hidden rounded border bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-700 [&_img]:size-32 [&_img]:object-cover [&>div]:flex [&>div]:justify-center [&>div]:gap-0.5 [&>div]:p-1 [&_button]:px-2 [&_button]:py-1" draggable="true" role="listitem" ondragstart={() => dragIndex=index} ondragend={() => dragIndex=null} ondragover={event => event.preventDefault()} ondrop={event => {event.preventDefault();reorder(outfit.galleryPhotoIds,dragIndex,index);dragIndex=null;}}><img src={thumb(mediaById.get(id))} alt={`関連写真 ${index+1}`}/><div><Button color="alternative" size="sm" aria-label={`関連写真 ${index+1}を前へ`} disabled={index === 0} onclick={() => reorder(outfit.galleryPhotoIds,index,index-1)}>←</Button><Button color="alternative" size="sm" aria-label={`関連写真 ${index+1}を後ろへ`} disabled={index === outfit.galleryPhotoIds.length-1} onclick={() => reorder(outfit.galleryPhotoIds,index,index+1)}>→</Button><Button color="alternative" size="sm" aria-label={`関連写真 ${index+1}を解除`} onclick={() => {outfit.galleryPhotoIds=outfit.galleryPhotoIds.filter(value=>value!==id);doc={...doc};changed();}}>×</Button></div></div>{/each}</div>
                </section>
                <section class="form-section mt-7 border-t pt-6 border-gray-200 dark:border-gray-700">
                  <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
                    <h2 class="text-lg font-semibold">三面図 <small class="text-xs font-normal text-gray-500">任意・複数枚</small></h2>
                    <div class="flex flex-wrap gap-2">
                      <Button color="alternative" size="sm" onclick={() => openPicker('three')}>画像を追加</Button>
                      <Button color="alternative" size="sm" onclick={() => {outfit.threeView=[...threeViews(outfit.threeView),{src:'',caption:''}];doc={...doc};changed();}}>URLで追加</Button>
                    </div>
                  </div>
                  {#each threeViews(outfit.threeView) as view, index}
                    <div class="mb-4 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                      <div class="mb-4 flex flex-wrap items-center justify-between gap-2">
                        <h3 class="text-sm font-semibold">三面図 {index + 1}</h3>
                        <div class="flex flex-wrap gap-2">
                          <Button color="alternative" size="xs" disabled={index === 0} onclick={() => reorder(outfit.threeView,index,index-1)} aria-label={`三面図${index+1}を上へ`}>↑</Button>
                          <Button color="alternative" size="xs" disabled={index === threeViews(outfit.threeView).length-1} onclick={() => reorder(outfit.threeView,index,index+1)} aria-label={`三面図${index+1}を下へ`}>↓</Button>
                          <Button color="alternative" size="xs" onclick={() => openPicker('three',index)}>画像を変更</Button>
                          <Button color="alternative" size="xs" onclick={() => removeThree(index)}>解除</Button>
                        </div>
                      </div>
                      <Label class="mb-4 grid gap-2 text-sm">画像URL<Input value={view.src || ''} placeholder="未設定なら表示しません" oninput={event => editThree(index,'src',event.currentTarget.value)}/></Label>
                      <Label class="grid gap-2 text-sm">説明<Input value={view.caption || ''} oninput={event => editThree(index,'caption',event.currentTarget.value)}/></Label>
                    </div>
                  {/each}
                </section>
              {/if}
              {#if kind === 'theme' || kind === 'outfit'}
                <section class="form-section mt-7 border-t pt-6 border-gray-200 dark:border-gray-700"><div class="section-top mb-5 flex flex-wrap items-center justify-between gap-3 [&_.eyebrow]:mb-0"><h2 class="text-lg font-semibold [&_small]:ml-2 [&_small]:text-xs [&_small]:font-normal [&_small]:text-gray-500">使用商品</h2><Button color="alternative" size="sm" onclick={() => {selected.credits = [...(selected.credits || []), {category:'衣装',name:'新しい商品',url:''}];doc={...doc};changed();}}>＋ 追加</Button></div>{#each selected.credits || [] as credit,index}<div class="credit-row grid grid-cols-2 items-center gap-2 xl:grid-cols-[100px_1fr_1.5fr_auto] max-[420px]:grid-cols-1"><Label class="mb-4 grid gap-2 text-sm">分類<Input bind:value={credit.category} oninput={changed}/></Label><Label class="mb-4 grid gap-2 text-sm">商品名<Input bind:value={credit.name} oninput={changed}/></Label><Label class="mb-4 grid gap-2 text-sm">商品URL<Input bind:value={credit.url} oninput={changed}/></Label><Button color="alternative" size="sm" aria-label={`使用商品 ${index+1}を削除`} onclick={()=>{selected.credits.splice(index,1);doc={...doc};changed();}}>×</Button></div>{/each}</section>
              {/if}
            {:else}<div class="empty px-6 py-18 text-center text-gray-600 dark:text-gray-400">素体を追加して、紹介を作りましょう。</div>{/if}
          </section>
        </div>
      {:else if tab === 'media'}
        <div class="page-title mb-8 flex flex-wrap items-start justify-between gap-5 min-[801px]:items-center [&_p:not(.eyebrow)]:text-sm [&_p:not(.eyebrow)]:leading-relaxed [&_p:not(.eyebrow)]:text-gray-600 dark:[&_p:not(.eyebrow)]:text-gray-400"><div><p class="eyebrow mb-2 text-xs font-semibold tracking-widest text-primary-700 dark:text-primary-300">MEDIA LIBRARY</p><h1 class="mb-3 text-3xl font-semibold tracking-tight">写真を管理</h1></div><span class="count text-xs tracking-widest text-gray-600 dark:text-gray-400">{library.length} PHOTOS</span></div>
        <div class="upload-zone mb-6 flex flex-wrap items-center gap-3 rounded-lg border border-dashed bg-gray-100 p-5 dark:bg-gray-800 border-gray-200 dark:border-gray-700 [&_span]:text-xs [&_small]:w-full [&_small]:text-xs" role="region" aria-label="画像の追加" ondragover={event=>event.preventDefault()} ondrop={event=>{event.preventDefault();importFiles(event.dataTransfer.files);}}><strong>写真をここへドロップ</strong><span>JPEG・PNG・WebP / 1枚25MBまで / 複数選択可</span><Label class="file-button m-0 block">画像を追加<Fileupload accept="image/jpeg,image/png,image/webp" multiple disabled={dirty || busy} onchange={event=>{importFiles(event.currentTarget.files);event.currentTarget.value='';}}/></Label><small>{dirty ? '先に編集内容を保存してください。' : '元画像を保持し、表示用WebPとサムネイルを自動作成します。'}</small></div>
        <div class="media-layout grid gap-6 min-[801px]:grid-cols-[minmax(0,1fr)_230px] xl:grid-cols-[minmax(0,1fr)_270px]"><section><Input class="search mb-4" aria-label="写真を検索" placeholder="ファイル名で検索…" bind:value={search} oninput={()=>page=0}/><div class="media-grid grid grid-cols-3 gap-3 xl:grid-cols-4 [&_button]:relative [&_button]:block [&_button]:min-w-0 [&_button]:overflow-hidden [&_button]:p-1 [&_button[aria-pressed=true]]:border-primary-500 [&_button[aria-pressed=true]]:ring-2 [&_button[aria-pressed=true]]:ring-primary-500 [&_img]:block [&_img]:aspect-[4/5] [&_img]:w-full [&_img]:rounded [&_img]:object-cover [&_button>span]:block [&_button>span]:px-0.5 [&_button>span]:py-1 [&_button>span]:text-xs">{#each filtered.slice(page*36,page*36+36) as photo (photo.id)}<Button color="alternative" size="sm" aria-pressed={selectedMediaId===photo.id} onclick={()=>selectedMediaId=photo.id}><img src={thumb(photo)} alt={photo.originalName || photo.id} loading="lazy"/><span>{photo.listed ? '掲載中' : '非掲載'}{photo.uploaded===false ? ' · ローカル' : ''}</span></Button>{/each}</div><div class="pager mt-5 flex items-center justify-center gap-4 text-xs text-gray-600 dark:text-gray-400"><Button color="alternative" size="sm" disabled={page===0} onclick={()=>page--}>前へ</Button><span>{page+1} / {Math.max(1,Math.ceil(filtered.length/36))}</span><Button color="alternative" size="sm" disabled={(page+1)*36>=filtered.length} onclick={()=>page++}>次へ</Button></div></section>
        <aside class="media-detail self-start space-y-4 rounded-lg border bg-white p-5 min-[801px]:sticky min-[801px]:top-25 dark:bg-gray-800 border-gray-200 dark:border-gray-700 [&>img]:max-h-75 [&>img]:w-full [&>img]:bg-gray-100 [&>img]:object-contain dark:[&>img]:bg-gray-700 [&_ul]:list-disc [&_ul]:pl-4 [&_li]:text-xs [&_li]:leading-relaxed">{#if selectedMedia}<img src={thumb(selectedMedia)} alt="選択中の写真"/><p class="filename text-xs leading-relaxed wrap-anywhere">{selectedMedia.originalName || selectedMedia.id}</p><p class="hint text-xs leading-relaxed text-gray-600 dark:text-gray-400">{selectedMedia.width} × {selectedMedia.height}</p><Checkbox checked={selectedMedia.listed} onchange={event=>setPhotoSetting(selectedMedia.id,'listed',event.currentTarget.checked)} classes={{ div: 'mb-4' }}>ギャラリーに掲載する</Checkbox><Label class="mb-4 grid gap-2 text-sm">撮影日時<Input type="datetime-local" value={new Date(Date.parse(selectedMedia.capturedAt)-new Date(selectedMedia.capturedAt).getTimezoneOffset()*60000).toISOString().slice(0,16)} onchange={event=>{if(event.currentTarget.value)setPhotoSetting(selectedMedia.id,'capturedAt',new Date(event.currentTarget.value).toISOString());}}/></Label>{#if selectedMedia.uploaded===false}<Button color="red" outline size="sm" disabled={dirty} onclick={()=>{if(confirm('この画像の取り込みを取り消し、CMS内の元画像・表示用画像・サムネイルを削除しますか？取り込み元のファイルは削除しません。'))run(async()=>{accept(await api('remove-pending',{id:selectedMediaId,revision}));selectedMediaId='';notice='取り込みを取り消しました。';});}}>取り込みを取り消す</Button>{/if}<h3 class="text-sm font-semibold">使用先</h3><ul>{#each photoUses(doc,selectedMedia.id) as use}<li>{use}</li>{:else}<li>紹介ページでは未使用</li>{/each}</ul><p class="hint text-xs leading-relaxed text-gray-600 dark:text-gray-400">掲載解除しても画像ファイルは削除しません。関連フォトからの解除はバリエーションの編集画面で行います。</p>{:else}<p class="hint text-xs leading-relaxed text-gray-600 dark:text-gray-400">写真を選ぶと、掲載設定と使用先を確認できます。</p>{/if}</aside></div>
      {:else}
        <div class="page-title mb-8 flex flex-wrap items-start justify-between gap-5 min-[801px]:items-center [&_p:not(.eyebrow)]:text-sm [&_p:not(.eyebrow)]:leading-relaxed [&_p:not(.eyebrow)]:text-gray-600 dark:[&_p:not(.eyebrow)]:text-gray-400"><div><p class="eyebrow mb-2 text-xs font-semibold tracking-widest text-primary-700 dark:text-primary-300">PREVIEW & PUBLISH</p><h1 class="mb-3 text-3xl font-semibold tracking-tight">確認して、公開へ</h1><p class="text-sm leading-relaxed text-gray-600 dark:text-gray-400">保存・画像アップロード・サイト公開を分けて進めます。</p></div></div>
        <div class="publish-steps grid gap-6 min-[801px]:grid-cols-2"><section class="edit-card min-w-0 space-y-4 rounded-lg border bg-white p-5 shadow-sm xl:p-7 dark:bg-gray-800 border-gray-200 dark:border-gray-700"><span class="step mb-3 block text-3xl text-primary-700 dark:text-primary-300">01</span><h2 class="text-lg font-semibold [&_small]:ml-2 [&_small]:text-xs [&_small]:font-normal [&_small]:text-gray-500">ローカルでプレビュー</h2><p class="text-sm leading-relaxed text-gray-600 dark:text-gray-400">保存済みの内容を確認します。未アップロード画像も、このCMSのプレビューでは表示できます。</p><div class="actions flex flex-wrap items-center gap-2"><Button color="alternative" size="sm" href="/avatars/" target="_blank" rel="noopener noreferrer">Avatars ↗</Button><Button color="alternative" size="sm" href="/gallery/" target="_blank" rel="noopener noreferrer">Gallery ↗</Button></div></section><section class="edit-card min-w-0 space-y-4 rounded-lg border bg-white p-5 shadow-sm xl:p-7 dark:bg-gray-800 border-gray-200 dark:border-gray-700"><span class="step mb-3 block text-3xl text-primary-700 dark:text-primary-300">02</span><h2 class="text-lg font-semibold [&_small]:ml-2 [&_small]:text-xs [&_small]:font-normal [&_small]:text-gray-500">画像をR2へアップロード</h2><p class="text-sm leading-relaxed text-gray-600 dark:text-gray-400">未アップロード <strong>{pending.length}枚</strong> / 表示用・サムネイル {pending.length*2}ファイル</p><p class="hint text-xs leading-relaxed text-gray-600 dark:text-gray-400">{configured ? 'R2の認証情報は設定済みです。' : '.env.r2.local に既存のR2認証情報を設定してCMSを再起動してください。'}</p><ul class="pending-list max-h-40 list-disc overflow-auto pl-4 text-xs leading-relaxed wrap-anywhere text-gray-600 dark:text-gray-400">{#each pending as photo}<li>{photo.originalName}</li>{/each}</ul><Button color="primary" size="sm" disabled={dirty || !configured || !pending.length} onclick={uploadR2}>対象を確認してアップロード</Button><p class="hint text-xs leading-relaxed text-gray-600 dark:text-gray-400">既存画像は上書きしません。送信後に内容を照合します。</p></section><section class="edit-card min-w-0 space-y-4 rounded-lg border bg-white p-5 shadow-sm xl:p-7 dark:bg-gray-800 border-gray-200 dark:border-gray-700"><span class="step mb-3 block text-3xl text-primary-700 dark:text-primary-300">03</span><h2 class="text-lg font-semibold [&_small]:ml-2 [&_small]:text-xs [&_small]:font-normal [&_small]:text-gray-500">公開用ビルドを確認</h2><p class="text-sm leading-relaxed text-gray-600 dark:text-gray-400">ローカルのdistへ公開用ファイルを生成します。管理画面は含まれません。</p><Button color="primary" size="sm" disabled={dirty || pending.length>0} onclick={()=>run(async()=>{const result=await api('build',{revision});notice=result.message;})}>公開用ビルドを作成</Button><p class="hint text-xs leading-relaxed text-gray-600 dark:text-gray-400">保存と画像アップロードを完了してから実行してください。</p></section><section class="edit-card min-w-0 space-y-4 rounded-lg border bg-white p-5 shadow-sm xl:p-7 dark:bg-gray-800 border-gray-200 dark:border-gray-700"><span class="step mb-3 block text-3xl text-primary-700 dark:text-primary-300">04</span><h2 class="text-lg font-semibold [&_small]:ml-2 [&_small]:text-xs [&_small]:font-normal [&_small]:text-gray-500">Gitで公開</h2><p class="text-sm leading-relaxed text-gray-600 dark:text-gray-400">差分を確認し、通常のGit操作でコミット・mainへプッシュすると、既存のGitHub Actionsがサイトを公開します。</p><p class="hint text-xs leading-relaxed text-gray-600 dark:text-gray-400">このCMSはコミット・プッシュを自動実行しません。更新履歴はGit、保存前の控えは .cms/backups に残ります。</p></section></div>
      {/if}
      </fieldset>
    {:else if !busy}<div class="empty px-6 py-18 text-center text-gray-600 dark:text-gray-400">CMSを起動できませんでした。<code>npm run cms</code> で起動して再読み込みしてください。</div>{/if}
  </main>
</div>

<Modal bind:open={pickerOpen} size="lg" dismissable={false} aria-label={pickerTitle} class="picker w-[92vw] max-w-4xl backdrop:backdrop-blur-sm" classes={{ body: 'max-h-[85dvh]' }}>
  <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
    <div><p class="mb-2 text-xs font-semibold tracking-widest text-primary-700 dark:text-primary-300">MEDIA LIBRARY</p><h2 class="text-lg font-semibold">{pickerTitle}</h2></div>
    <Button color="alternative" size="sm" onclick={()=>pickerOpen = false}>完了 ×</Button>
  </div>
  <p class="text-xs leading-relaxed text-gray-600 dark:text-gray-400">{pickerMode === 'related' ? '掲載中の写真から複数選択できます。選択順で追加されます。' : pickerMode === 'main' ? '非掲載の画像も複数選択できます。代表写真の後ろに選択順で追加されます。' : '写真をクリックして設定します。'}</p>
  <Input class="search mb-4" aria-label="選択する写真を検索" placeholder="ファイル名で検索…" bind:value={pickerSearch} oninput={()=>pickerPage=0}/>
  <div class="picker-grid grid grid-cols-3 gap-3 sm:grid-cols-6 [&_button]:relative [&_button]:block [&_button]:min-w-0 [&_button]:overflow-hidden [&_button]:p-1 [&_button[aria-pressed=true]]:border-primary-500 [&_button[aria-pressed=true]]:ring-2 [&_button[aria-pressed=true]]:ring-primary-500 [&_img]:block [&_img]:aspect-[4/5] [&_img]:w-full [&_img]:rounded [&_img]:object-cover">
    {#each pickerPhotos.slice(pickerPage*36,pickerPage*36+36) as photo (photo.id)}
      <Button color="alternative" size="sm" disabled={pickerMode === 'main' && photo.id === outfit?.photo} aria-pressed={pickerMultiple ? pickerSelection.includes(photo.id) : undefined} onclick={()=>choose(photo)}>
        <img src={thumb(photo)} alt={photo.originalName || photo.id} loading="lazy"/>
        {#if pickerMode === 'main' && photo.id === outfit?.photo}
          <span class="absolute top-2 left-2 rounded bg-gray-900/80 px-2 py-1 text-xs text-white">代表写真</span>
        {:else if pickerMultiple && pickerSelection.includes(photo.id)}
          <span class="selected-mark absolute top-2 left-2 rounded-full bg-primary-700 px-2 py-1 text-xs text-white">✓ {pickerSelection.indexOf(photo.id) + (pickerMode === 'main' ? 2 : 1)}</span>
        {/if}
      </Button>
    {/each}
  </div>
  <div class="pager mt-5 flex items-center justify-center gap-4 text-xs text-gray-600 dark:text-gray-400"><Button color="alternative" size="sm" disabled={pickerPage===0} onclick={()=>pickerPage--}>前へ</Button><span>{pickerPage+1} / {Math.max(1,Math.ceil(pickerPhotos.length/36))}</span><Button color="alternative" size="sm" disabled={(pickerPage+1)*36>=pickerPhotos.length} onclick={()=>pickerPage++}>次へ</Button></div>
</Modal>
