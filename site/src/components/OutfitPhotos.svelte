<script>
  import { avatarPhotoUrl as photoUrl } from '../lib/avatars.js';
  import { outfitPhotoIds } from '../lib/outfit-photos.js';

  export let outfit;
  export let name;

  let selectedId;
  $: photos = outfitPhotoIds(outfit);
  $: activeId = photos.includes(selectedId) ? selectedId : photos[0];
  $: activeIndex = photos.indexOf(activeId);
</script>

<div class="outfit-photo relative min-w-0 overflow-hidden rounded-lg bg-gray-100 sm:sticky sm:top-22 dark:bg-gray-700">
  <img class="block h-[55vh] min-h-[300px] w-full object-contain sm:h-[min(720px,78vh)]" src={photoUrl(activeId)} alt={photos.length > 1 ? `${name}（${activeIndex + 1} / ${photos.length}）` : name} />
  {#if photos.length > 1}
    <div class="absolute inset-x-3 bottom-3 rounded-xl border border-white/30 bg-white/90 p-2 shadow-lg backdrop-blur-md sm:inset-x-4 sm:bottom-4 dark:border-gray-600/70 dark:bg-gray-900/85">
      <div class="mb-1.5 flex items-center justify-between px-1 text-xs text-gray-600 dark:text-gray-300">
        <span>画像を選択</span>
        <span aria-live="polite" aria-atomic="true">{activeIndex + 1} / {photos.length}</span>
      </div>
      <div class="flex gap-2 overflow-x-auto overscroll-x-contain p-1" role="group" aria-label={`${outfit.name}のメイン画像`}>
        {#each photos as id, index (id)}
          <button
            type="button"
            class="size-14 shrink-0 overflow-hidden rounded-md border border-gray-300 bg-gray-100 p-0.5 transition-colors hover:border-primary-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 aria-pressed:border-primary-700 aria-pressed:ring-2 aria-pressed:ring-primary-700 sm:size-16 dark:border-gray-600 dark:bg-gray-700 dark:aria-pressed:border-primary-300 dark:aria-pressed:ring-primary-300 motion-reduce:transition-none"
            aria-label={`${outfit.name}の画像 ${index + 1}を表示`}
            aria-pressed={activeId === id}
            onclick={() => selectedId = id}
          >
            <img class="size-full rounded-sm object-contain" src={photoUrl(id, true)} alt="" loading="lazy" />
          </button>
        {/each}
      </div>
    </div>
  {/if}
</div>
