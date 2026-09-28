<script>
  import { onMount, onDestroy, tick } from 'svelte';
  import { Button, Modal } from 'flowbite-svelte';
  import {
    ChevronLeftOutline,
    ChevronRightOutline,
    CloseOutline,
  } from 'flowbite-svelte-icons';
  import SiteHeader from '../../components/SiteHeader.svelte';
  import { createJustifiedLayout } from '../../lib/justified-gallery.js';
  import { galleryImageUrl } from '../../lib/gallery-media.js';
  import gallery from '../../lib/gallery-data.js';
  import { avatars, isSampleContent } from '../../lib/avatars.js';
  import { galleryPhotoIndex, galleryReturnHref, galleryNavigationPhotos, photoOutfitLinks } from '../../lib/avatar-gallery.js';

  const dateFormatter = new Intl.DateTimeFormat('ja-JP', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'Asia/Tokyo',
  });

  let activeIndex = null;
  let lastTrigger;
  let previousBodyOverflow = '';
  let galleryWidth = 0;
  let viewportWidth = 0;
  let navigationPhotos = gallery;

  $: relatedOutfits = activeIndex === null ? [] : photoOutfitLinks(gallery[activeIndex].id, avatars);
  $: navigationIndex = activeIndex === null ? -1 : navigationPhotos.findIndex((photo) => photo.id === gallery[activeIndex].id);
  $: navigationCount = navigationIndex < 0 ? 1 : navigationPhotos.length;
  $: counterWidth = String(navigationCount).length;

  const imageUrl = galleryImageUrl;
  const formatCapturedAt = (capturedAt) =>
    dateFormatter.format(new Date(capturedAt));

  $: singleColumn = viewportWidth > 0 && viewportWidth <= 560;
  $: galleryGap = singleColumn ? 10 : viewportWidth <= 900 ? 12 : 14;
  $: targetRowHeight =
    viewportWidth > 0 && viewportWidth <= 900 ? 220 : 240;
  $: galleryLayout = createJustifiedLayout(gallery, {
    containerWidth: galleryWidth,
    gap: galleryGap,
    targetRowHeight,
    singleColumn,
  });
  $: galleryReady =
    galleryWidth > 0 &&
    viewportWidth > 0 &&
    galleryLayout.items.length === gallery.length;

  function updatePhotoUrl(index) {
    const url = new URL(window.location.href);
    if (index === null) url.searchParams.delete('photo');
    else url.searchParams.set('photo', gallery[index].id);
    window.history.replaceState(window.history.state, '', url);
  }

  function openLightbox(index, event, updateUrl = true) {
    navigationPhotos = galleryNavigationPhotos(window.location.search, avatars, gallery);
    if (activeIndex === null) {
      lastTrigger = event?.currentTarget ?? document.querySelector(`[data-gallery-index="${index}"]`);
      previousBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    activeIndex = index;
    if (updateUrl) updatePhotoUrl(index);
  }

  async function closeLightbox(updateUrl = true) {
    if (activeIndex === null) return;

    const returnTo = updateUrl ? galleryReturnHref(window.location.search, avatars) : null;
    if (returnTo) {
      // Replace the photo entry so Back does not reopen the lightbox just closed.
      window.location.replace(returnTo);
      return;
    }

    activeIndex = null;
    if (updateUrl) updatePhotoUrl(null);
    document.body.style.overflow = previousBodyOverflow;
    await tick();
    lastTrigger?.focus();
  }

  function movePhoto(offset) {
    if (navigationIndex < 0 || navigationPhotos.length <= 1) return;
    const nextPhoto = navigationPhotos[(navigationIndex + offset + navigationPhotos.length) % navigationPhotos.length];
    activeIndex = gallery.findIndex((photo) => photo.id === nextPhoto.id);
    updatePhotoUrl(activeIndex);
  }

  function showPrevious() {
    movePhoto(-1);
  }

  function showNext() {
    movePhoto(1);
  }

  function handleKeydown(event) {
    if (activeIndex === null) return;

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      showPrevious();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      showNext();
    }
  }

  onMount(() => {
    function syncPhotoFromUrl() {
      const index = galleryPhotoIndex(window.location.search, gallery);
      if (index >= 0) openLightbox(index, undefined, false);
      else closeLightbox(false);
    }
    syncPhotoFromUrl();
    window.addEventListener('popstate', syncPhotoFromUrl);
    return () => window.removeEventListener('popstate', syncPhotoFromUrl);
  });

  onDestroy(() => {
    if (typeof document !== 'undefined' && activeIndex !== null) {
      document.body.style.overflow = previousBodyOverflow;
    }
  });
</script>

<svelte:window bind:innerWidth={viewportWidth} onkeydown={handleKeydown} />
<svelte:head><title>Gallery | 五香ことり</title></svelte:head>

<div class="gallery-page min-h-screen bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-50">
  <SiteHeader current="gallery" />
  <main class="mx-auto w-[calc(100%-24px)] max-w-[1320px] pt-10 pb-14 min-[561px]:w-[calc(100%-36px)] min-[561px]:pt-14 min-[561px]:pb-18 min-[901px]:w-[calc(100%-48px)] min-[901px]:pt-12 min-[901px]:pb-24">
    <section aria-labelledby="gallery-title">
      <div class="mb-6 sm:mb-8">
        <h1 id="gallery-title" class="text-5xl leading-none font-extrabold tracking-tight md:text-6xl">Gallery</h1>
        <span class="mt-4 block h-1 w-12 rounded-full bg-primary-500 sm:w-14" aria-hidden="true"></span>
      </div>
      <div class="justified-gallery relative w-full" bind:clientWidth={galleryWidth} aria-busy={!galleryReady} style:height={`${galleryLayout.height}px`}>
        {#each gallery as photo, index (photo.id)}
          {@const placement = galleryLayout.items[index]}
          <Button
            color="alternative"
            class="gallery-card group absolute block cursor-zoom-in overflow-hidden rounded-xl border-0 bg-gray-100 p-0 shadow-lg transition duration-200 hover:z-2 hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-500 motion-reduce:transition-none dark:bg-gray-900 {galleryReady ? 'visible opacity-100' : 'invisible opacity-0'}"
            aria-label={`写真 ${index + 1} を拡大表示`}
            data-gallery-index={index}
            style={`left: ${placement?.x ?? 0}px; top: ${placement?.y ?? 0}px; width: ${placement?.width ?? 0}px; height: ${placement?.height ?? 0}px;`}
            onclick={(event) => openLightbox(index, event)}
          >
            <img class="block h-full w-full object-contain transition-transform duration-500 group-hover:scale-[1.012] motion-reduce:transition-none" src={imageUrl(photo.thumbnailKey)} alt="" width={photo.width} height={photo.height} loading={index === 0 ? 'eager' : 'lazy'} fetchpriority={photo.featured ? 'high' : 'auto'} />
          </Button>
        {/each}
      </div>
    </section>
  </main>
</div>

{#if activeIndex !== null}
  {@const activePhoto = gallery[activeIndex]}
  <Modal
    open
    size="xl"
    dismissable={false}
    focustrap
    transitionParams={{ duration: 0 }}
    aria-labelledby="lightbox-title"
    oncancel={(event) => { event.preventDefault(); closeLightbox(); }}
    class="lightbox m-auto h-dvh max-h-none w-full max-w-[1180px] overflow-hidden rounded-none border-0 shadow-2xl backdrop:bg-gray-200/95 backdrop:backdrop-blur-md min-[561px]:h-[min(900px,calc(100dvh-56px))] min-[561px]:w-[calc(100%-56px)] min-[561px]:rounded-2xl dark:backdrop:bg-gray-950/95"
    classes={{ body: 'relative grid h-full min-h-0 grid-rows-[minmax(0,1fr)_auto] space-y-0 overflow-hidden p-0 md:p-0' }}
  >
    <Button color="alternative" pill data-autofocus class="absolute top-3 right-3 z-10 size-11 p-0 backdrop-blur-sm sm:top-4 sm:right-4" aria-label="拡大表示を閉じる" onclick={() => closeLightbox()}>
      <CloseOutline size="26" />
    </Button>
    <div class="min-h-0 px-2 pt-16 pb-2 sm:p-5">
      <img class="block h-full w-full object-contain" src={imageUrl(activePhoto.displayKey)} alt="" width={activePhoto.width} height={activePhoto.height} />
    </div>
    <div class="lightbox-details flex items-start justify-between gap-8 border-t border-gray-200 px-4 pt-4 pb-5 text-gray-900 sm:items-end sm:px-6 dark:border-gray-700 dark:text-gray-50" aria-live="polite">
      <div class="min-w-0 max-w-3xl">
        <p id="lightbox-title" class="text-base font-bold tracking-widest uppercase">VRChat</p>
        <time class="text-xs tracking-widest text-gray-600 dark:text-gray-400" datetime={activePhoto.capturedAt}>{formatCapturedAt(activePhoto.capturedAt)}</time>
        {#if relatedOutfits.length}
          <nav class="mt-2 flex max-h-30 flex-col gap-1.5 overflow-y-auto p-1" aria-label="この写真のアバター紹介">
            {#each relatedOutfits as item (item.href)}
              <a class="text-xs leading-relaxed wrap-anywhere underline underline-offset-4 hover:text-primary-600 focus-visible:outline-2 focus-visible:outline-primary-500 dark:hover:text-primary-300" href={item.href}>{item.label} <span aria-hidden="true">↗</span></a>
            {/each}
          </nav>
          {#if isSampleContent}<p class="mt-1.5 text-xs text-gray-600 dark:text-gray-400">紹介との関連付けはサンプルです。</p>{/if}
        {/if}
      </div>
      <span class="shrink-0 text-xs tracking-widest text-gray-600 dark:text-gray-400">
        {String(Math.max(0, navigationIndex) + 1).padStart(counterWidth, '0')} / {String(navigationCount).padStart(counterWidth, '0')}
      </span>
    </div>
    {#if navigationCount > 1}
      <Button color="alternative" pill class="absolute top-[44%] left-2 z-10 size-11 -translate-y-1/2 p-0 backdrop-blur-sm sm:left-4" aria-label="前の写真" onclick={showPrevious}><ChevronLeftOutline size="28" /></Button>
      <Button color="alternative" pill class="absolute top-[44%] right-2 z-10 size-11 -translate-y-1/2 p-0 backdrop-blur-sm sm:right-4" aria-label="次の写真" onclick={showNext}><ChevronRightOutline size="28" /></Button>
    {/if}
  </Modal>
{/if}
