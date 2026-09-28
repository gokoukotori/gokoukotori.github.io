<script>
  import { Card } from 'flowbite-svelte';
  import gallery from '../lib/gallery-data.js';
  import { galleryImageUrl } from '../lib/gallery-media.js';
  import { galleryPhotoHref, outfitGalleryPhotos } from '../lib/avatar-gallery.js';

  export let outfit;
  export let returnTo;
  $: photos = outfitGalleryPhotos(outfit, gallery);
</script>

{#if photos.length}
  <section class="related-gallery mt-9 border-t pt-6 sm:mt-14 sm:pt-8 border-gray-200 dark:border-gray-700" aria-labelledby="related-gallery-title">
    <div class="heading mb-6 flex flex-wrap items-end justify-between gap-4 [&_h2]:flex [&_h2]:flex-wrap [&_h2]:items-baseline [&_h2]:gap-4 [&_h2]:text-2xl [&_h2]:font-medium sm:[&_h2]:text-3xl [&_h2_span]:text-xs [&_h2_span]:font-normal [&_h2_span]:text-gray-600 dark:[&_h2_span]:text-gray-400">
      <div>
        <p class="eyebrow mb-2 text-xs font-semibold tracking-widest text-primary-700 dark:text-primary-300">IN THE GALLERY</p>
        <h2 id="related-gallery-title">関連フォト<span>{outfit.name} · {photos.length}枚</span></h2>
      </div>
      <p class="hint text-xs leading-relaxed text-gray-600 dark:text-gray-400">写真を選ぶとギャラリーで開きます。</p>
    </div>
    <div class="photos grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5">
      {#each photos as photo, index (photo.id)}
        <Card size="xl" class="group relative block aspect-[3/4] overflow-hidden p-0 sm:aspect-[4/3] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-500" href={galleryPhotoHref(photo.id, returnTo)} aria-label={`${outfit.name}の関連写真 ${index + 1}をギャラリーで見る`}>
          <img class="h-full w-full object-cover object-[50%_30%] transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none" src={galleryImageUrl(photo.thumbnailKey)} alt={`${outfit.name}の関連写真 ${index + 1}`} width={photo.width} height={photo.height} loading="lazy" />
          <span class="absolute right-3 bottom-3 grid size-8 place-items-center rounded-full bg-white/95 text-gray-900" aria-hidden="true">↗</span>
        </Card>
      {/each}
    </div>
  </section>
{/if}
