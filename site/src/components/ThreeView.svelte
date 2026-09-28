<script>
  import { Button } from 'flowbite-svelte';
  import { siteImageUrl } from '../lib/gallery-media.js';
  import { threeViews } from '../lib/three-views.js';
  export let view;
  export let name;
  export let sample = false;
  $: views = threeViews(view).filter(image => image.src || sample);

  const directions = [
    { label: '正面', english: 'FRONT' },
    { label: '側面', english: 'SIDE' },
    { label: '背面', english: 'BACK' },
  ];
</script>

{#if views.length}
  <section class="three-view mt-9 border-t pt-6 sm:mt-14 sm:pt-8 border-gray-200 dark:border-gray-700" aria-labelledby="three-view-title">
    <div class="heading mb-6 flex items-start justify-between gap-5 sm:items-end [&_h2]:flex [&_h2]:flex-wrap [&_h2]:items-baseline [&_h2]:gap-2 [&_h2]:text-2xl [&_h2]:font-medium sm:[&_h2]:gap-4 sm:[&_h2]:text-3xl [&_h2_span]:w-full [&_h2_span]:text-sm [&_h2_span]:font-normal [&_h2_span]:text-gray-600 dark:[&_h2_span]:text-gray-400 sm:[&_h2_span]:w-auto">
      <div>
        <p class="eyebrow mb-2 text-xs font-semibold tracking-widest text-primary-700 dark:text-primary-300">THREE VIEWS</p>
        <h2 id="three-view-title">三面図<span>{name}</span></h2>
      </div>
    </div>
    <div class="grid gap-8">
    {#each views as view, index}
    <figure>
      {#if view.src}
        <div class="mb-3 flex justify-end">
          <Button outline size="sm" href={siteImageUrl(view.src)} target="_blank" rel="noopener noreferrer" aria-label={`${name}の三面図${index + 1}を拡大（新しいタブ）`}>
            {views.length > 1 ? `画像 ${index + 1} を拡大` : '画像を拡大'} <span aria-hidden="true">↗</span>
          </Button>
        </div>
      {/if}
      {#if view.src}
        <a class="image-link block overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-500" href={siteImageUrl(view.src)} target="_blank" rel="noopener noreferrer" aria-label={`${name}の三面図を拡大（新しいタブ）`}>
          <img class="block h-auto w-full object-contain" src={siteImageUrl(view.src)} alt={`${name}の三面図（正面・側面・背面）`} loading="lazy" />
        </a>
      {:else}
        <div class="placeholder grid grid-cols-3 divide-x divide-gray-200 overflow-hidden rounded-lg border dark:divide-gray-600 border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-700" aria-label="三面図の配置サンプル">
          {#each directions as direction, index}
            <div class="view-panel relative grid min-h-45 place-items-center sm:aspect-square sm:max-h-90">
              <span class="number absolute top-3 left-3 text-xs tracking-widest sm:top-4 sm:left-4 text-gray-600 dark:text-gray-400">0{index + 1}</span>
              <div class="direction grid justify-items-center gap-2 rounded border p-3 sm:px-6 sm:py-4 border-gray-200 dark:border-gray-700 [&_span]:text-xs [&_span]:tracking-widest [&_span]:text-primary-700 dark:[&_span]:text-primary-300 [&_strong]:text-base [&_strong]:font-normal sm:[&_strong]:text-lg"><span>{direction.english}</span><strong>{direction.label}</strong></div>
            </div>
          {/each}
        </div>
        <p class="sample-caption mt-3 text-xs leading-relaxed text-gray-600 dark:text-gray-400">三面図の配置サンプルです。実際の画像は未設定です。</p>
      {/if}
      {#if view.caption}<figcaption class="mt-3 text-xs leading-relaxed text-gray-600 dark:text-gray-400">{view.caption}</figcaption>{/if}
    </figure>
    {/each}
    </div>
  </section>
{/if}
