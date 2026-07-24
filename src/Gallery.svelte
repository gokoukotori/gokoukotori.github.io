<script>
  import { onDestroy, tick } from 'svelte';
  import {
    ChevronLeftOutline,
    ChevronRightOutline,
    CloseOutline,
  } from 'flowbite-svelte-icons';
  import SiteHeader from './components/SiteHeader.svelte';
  import { createJustifiedLayout } from './lib/justified-gallery.js';
  import { galleryImageUrl } from './lib/gallery-media.js';
  import gallery from './data/gallery.json';

  const counterWidth = String(gallery.length).length;
  const dateFormatter = new Intl.DateTimeFormat('ja-JP', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'Asia/Tokyo',
  });

  let activeIndex = null;
  let closeButton;
  let lastTrigger;
  let previousBodyOverflow = '';
  let galleryWidth = 0;
  let viewportWidth = 0;

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

  async function openLightbox(index, event) {
    lastTrigger = event.currentTarget;
    previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    activeIndex = index;
    await tick();
    closeButton?.focus();
  }

  async function closeLightbox() {
    if (activeIndex === null) return;

    activeIndex = null;
    document.body.style.overflow = previousBodyOverflow;
    await tick();
    lastTrigger?.focus();
  }

  function showPrevious() {
    activeIndex = (activeIndex - 1 + gallery.length) % gallery.length;
  }

  function showNext() {
    activeIndex = (activeIndex + 1) % gallery.length;
  }

  function handleKeydown(event) {
    if (activeIndex === null) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      closeLightbox();
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      showPrevious();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      showNext();
    }
  }

  function handleBackdropClick(event) {
    if (event.currentTarget === event.target) {
      closeLightbox();
    }
  }

  onDestroy(() => {
    if (typeof document !== 'undefined') {
      document.body.style.overflow = previousBodyOverflow;
    }
  });
</script>

<svelte:window bind:innerWidth={viewportWidth} onkeydown={handleKeydown} />

{#snippet galleryCard(photo, index, placement)}
  <button
    type="button"
    class="gallery-card"
    aria-label={`写真 ${index + 1} を拡大表示`}
    data-gallery-index={index}
    style={`left: ${placement?.x ?? 0}px; top: ${placement?.y ?? 0}px; width: ${placement?.width ?? 0}px; height: ${placement?.height ?? 0}px;`}
    onclick={(event) => openLightbox(index, event)}
  >
    <img
      src={imageUrl(photo.thumbnailKey)}
      alt=""
      width={photo.width}
      height={photo.height}
      loading={index === 0 ? 'eager' : 'lazy'}
      fetchpriority={photo.featured ? 'high' : 'auto'}
    />
  </button>
{/snippet}

<div class="gallery-page">
  <SiteHeader current="gallery" />

  <main class="gallery-main">
    <section aria-labelledby="gallery-title">
      <div class="gallery-heading">
        <h1 id="gallery-title">Gallery</h1>
        <span aria-hidden="true"></span>
      </div>

      <div
        class="justified-gallery"
        class:justified-gallery--ready={galleryReady}
        bind:clientWidth={galleryWidth}
        aria-busy={!galleryReady}
        style={`height: ${galleryLayout.height}px;`}
      >
        {#each gallery as photo, index (photo.id)}
          {@render galleryCard(photo, index, galleryLayout.items[index])}
        {/each}
      </div>
    </section>
  </main>
</div>

{#if activeIndex !== null}
  {@const activePhoto = gallery[activeIndex]}
  <div
    class="lightbox-backdrop"
    role="presentation"
    onclick={handleBackdropClick}
  >
    <div
      class="lightbox"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lightbox-title"
    >
      <button
        bind:this={closeButton}
        type="button"
        class="lightbox-close"
        aria-label="拡大表示を閉じる"
        onclick={closeLightbox}
      >
        <CloseOutline size="26" />
      </button>

      <div class="lightbox-image-wrap">
        <img
          src={imageUrl(activePhoto.displayKey)}
          alt=""
          width={activePhoto.width}
          height={activePhoto.height}
        />
      </div>

      <div class="lightbox-details" aria-live="polite">
        <div>
          <p id="lightbox-title">VRChat</p>
          <time datetime={activePhoto.capturedAt}>
            {formatCapturedAt(activePhoto.capturedAt)}
          </time>
        </div>
        <span>
          {String(activeIndex + 1).padStart(counterWidth, '0')} /
          {String(gallery.length).padStart(counterWidth, '0')}
        </span>
      </div>

      <button
        type="button"
        class="lightbox-nav lightbox-nav--previous"
        aria-label="前の写真"
        onclick={showPrevious}
      >
        <ChevronLeftOutline size="28" />
      </button>
      <button
        type="button"
        class="lightbox-nav lightbox-nav--next"
        aria-label="次の写真"
        onclick={showNext}
      >
        <ChevronRightOutline size="28" />
      </button>
    </div>
  </div>
{/if}

<style>
  :global(body) {
    margin: 0;
  }

  :global(body:has(.lightbox-backdrop)) {
    overscroll-behavior: none;
  }

  .gallery-page {
    min-height: 100vh;
    background: #ffffff;
    color: #18181b;
  }

  :global(.dark) .gallery-page {
    background: #1f2937;
    color: #f8fafc;
  }

  .gallery-main {
    width: min(100% - 48px, 1320px);
    margin: 0 auto;
    padding: 46px 0 96px;
  }

  .gallery-heading {
    margin-bottom: 30px;
  }

  .gallery-heading h1 {
    margin: 0;
    font-size: clamp(2.8rem, 4vw, 3.7rem);
    font-weight: 800;
    line-height: 0.95;
    letter-spacing: -0.055em;
  }

  .gallery-heading span {
    display: block;
    width: 56px;
    height: 3px;
    margin-top: 16px;
    border-radius: 999px;
    background: var(--color-primary-500);
  }

  .justified-gallery {
    position: relative;
    width: 100%;
  }

  .justified-gallery--ready .gallery-card {
    visibility: visible;
    opacity: 1;
  }

  .gallery-card {
    position: absolute;
    display: block;
    visibility: hidden;
    overflow: hidden;
    border: 0;
    border-radius: 12px;
    background: #dedbd3;
    padding: 0;
    opacity: 0;
    cursor: zoom-in;
    box-shadow: 0 16px 44px rgb(15 23 42 / 0.08);
    transition:
      transform 220ms ease,
      box-shadow 220ms ease,
      opacity 220ms ease;
  }

  :global(.dark) .gallery-card {
    background: #15171c;
    box-shadow: 0 18px 50px rgb(0 0 0 / 0.24);
  }

  .gallery-card:hover {
    z-index: 2;
    transform: translateY(-3px);
    box-shadow: 0 22px 56px rgb(15 23 42 / 0.16);
  }

  :global(.dark) .gallery-card:hover {
    box-shadow: 0 24px 62px rgb(0 0 0 / 0.42);
  }

  .gallery-card:focus-visible {
    outline: 3px solid var(--color-primary-500);
    outline-offset: 4px;
  }

  .gallery-card img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
    transition: transform 500ms cubic-bezier(0.2, 0.7, 0.2, 1);
  }

  .gallery-card:hover img {
    transform: scale(1.012);
  }


  .lightbox-backdrop {
    --lightbox-backdrop: rgb(229 231 235 / 0.92);
    --lightbox-surface: #ffffff;
    --lightbox-border: rgb(15 23 42 / 0.14);
    --lightbox-divider: rgb(15 23 42 / 0.1);
    --lightbox-text: #111827;
    --lightbox-muted: #6b7280;
    --lightbox-control-background: rgb(255 255 255 / 0.84);
    --lightbox-control-border: rgb(15 23 42 / 0.18);
    --lightbox-control-text: #111827;
    --lightbox-shadow: 0 36px 110px rgb(15 23 42 / 0.24);
    position: fixed;
    inset: 0;
    z-index: 100;
    display: grid;
    place-items: center;
    overflow: auto;
    padding: 28px;
    background: var(--lightbox-backdrop);
    backdrop-filter: blur(16px);
  }

  :global(.dark) .lightbox-backdrop {
    --lightbox-backdrop: rgb(3 4 7 / 0.94);
    --lightbox-surface: #0b0c10;
    --lightbox-border: rgb(255 255 255 / 0.12);
    --lightbox-divider: rgb(255 255 255 / 0.1);
    --lightbox-text: #f8fafc;
    --lightbox-muted: #a1a1aa;
    --lightbox-control-background: rgb(9 10 14 / 0.78);
    --lightbox-control-border: rgb(255 255 255 / 0.18);
    --lightbox-control-text: #ffffff;
    --lightbox-shadow: 0 36px 110px rgb(0 0 0 / 0.58);
  }

  .lightbox {
    position: relative;
    display: grid;
    grid-template-rows: minmax(0, 1fr) auto;
    width: min(1180px, 100%);
    height: min(900px, calc(100vh - 56px));
    overflow: hidden;
    border: 1px solid var(--lightbox-border);
    border-radius: 18px;
    background: var(--lightbox-surface);
    box-shadow: var(--lightbox-shadow);
  }

  .lightbox-image-wrap {
    min-height: 0;
    padding: 18px;
  }

  .lightbox-image-wrap img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .lightbox-details {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 32px;
    border-top: 1px solid var(--lightbox-divider);
    padding: 18px 24px 20px;
    color: var(--lightbox-text);
  }

  .lightbox-details div {
    max-width: 760px;
  }

  .lightbox-details p,
  .lightbox-details time {
    margin: 0;
  }

  #lightbox-title {
    font-size: 1rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .lightbox-details time,
  .lightbox-details > span {
    color: var(--lightbox-muted);
    font-size: 0.78rem;
    letter-spacing: 0.08em;
  }

  .lightbox-close,
  .lightbox-nav {
    position: absolute;
    z-index: 3;
    display: grid;
    place-items: center;
    width: 46px;
    height: 46px;
    border: 1px solid var(--lightbox-control-border);
    border-radius: 999px;
    background: var(--lightbox-control-background);
    color: var(--lightbox-control-text);
    cursor: pointer;
    backdrop-filter: blur(10px);
    transition:
      background 160ms ease,
      border-color 160ms ease,
      transform 160ms ease;
  }

  .lightbox-close:hover,
  .lightbox-nav:hover {
    border-color: color-mix(
      in srgb,
      var(--color-primary-500) 80%,
      transparent
    );
    background: color-mix(
      in srgb,
      var(--color-primary-500) 88%,
      transparent
    );
    color: #ffffff;
  }

  .lightbox-close:focus-visible,
  .lightbox-nav:focus-visible {
    outline: 3px solid var(--color-primary-500);
    outline-offset: 3px;
  }

  .lightbox-close {
    top: 18px;
    right: 18px;
  }

  .lightbox-nav {
    top: 44%;
    transform: translateY(-50%);
  }

  .lightbox-nav:hover {
    transform: translateY(-50%) scale(1.04);
  }

  .lightbox-nav--previous {
    left: 18px;
  }

  .lightbox-nav--next {
    right: 18px;
  }

  @media (max-width: 900px) {
    .gallery-main {
      width: min(100% - 36px, 800px);
      padding: 56px 0 72px;
    }

    .gallery-heading {
      margin-bottom: 30px;
    }


    .lightbox {
      height: min(1040px, calc(100vh - 36px));
    }
  }

  @media (max-width: 560px) {
    .gallery-main {
      width: calc(100% - 24px);
      padding: 42px 0 56px;
    }

    .gallery-heading {
      margin-bottom: 24px;
    }

    .gallery-heading h1 {
      font-size: 2.8rem;
    }

    .gallery-heading span {
      width: 48px;
      margin-top: 16px;
    }

    .gallery-card {
      border-radius: 9px;
    }

    .lightbox-backdrop {
      padding: 0;
    }

    .lightbox {
      width: 100%;
      height: 100dvh;
      border: 0;
      border-radius: 0;
    }

    .lightbox-image-wrap {
      padding: 64px 8px 10px;
    }

    .lightbox-details {
      align-items: start;
      padding: 14px 16px 20px;
    }

    .lightbox-details > span {
      flex: 0 0 auto;
    }

    .lightbox-close {
      top: 12px;
      right: 12px;
    }

    .lightbox-nav {
      top: 46%;
      width: 42px;
      height: 42px;
    }

    .lightbox-nav--previous {
      left: 8px;
    }

    .lightbox-nav--next {
      right: 8px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .gallery-card,
    .gallery-card img,
    .lightbox-close,
    .lightbox-nav {
      transition: none;
    }
  }
</style>
