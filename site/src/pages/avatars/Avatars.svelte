<script>
  import { onMount, tick } from 'svelte';
  import { Alert, Breadcrumb, BreadcrumbItem, Card, Footer } from 'flowbite-svelte';
  import SiteHeader from '../../components/SiteHeader.svelte';
  import ThreeView from '../../components/ThreeView.svelte';
  import RelatedGallery from '../../components/RelatedGallery.svelte';
  import { avatars, isSampleContent } from '../../lib/avatars.js';
  import { galleryImageUrl } from '../../lib/gallery-media.js';
  import { avatarHref, resolveAvatarRoute } from '../../lib/avatar-navigation.js';

  let hash = typeof window === 'undefined' ? '' : window.location.hash;
  let pageHeading;
  $: route = resolveAvatarRoute(hash, avatars);
  $: ({ avatar, theme, outfit, notFound } = route);
  $: pageTitle = notFound ? 'ページが見つかりません' : theme ? `${theme.name} / ${avatar.name}` : avatar?.name ?? 'Avatars';
  const photoUrl = (photo, thumbnail = false) => galleryImageUrl(`${thumbnail ? 'thumbnails' : 'display'}/${photo}.webp`);
  const outfitCount = (item) => item.themes.reduce((total, collection) => total + collection.outfits.length, 0);

  onMount(() => {
    async function navigate() {
      const previousPage = [route.avatar?.id, route.theme?.id, route.notFound].join('/');
      hash = window.location.hash;
      await tick();
      const nextPage = [route.avatar?.id, route.theme?.id, route.notFound].join('/');
      if (previousPage !== nextPage) {
        pageHeading?.focus({ preventScroll: true });
        window.scrollTo({ top: 0, behavior: 'instant' });
      }
    }
    window.addEventListener('hashchange', navigate);
    return () => window.removeEventListener('hashchange', navigate);
  });
</script>

<svelte:head><title>{pageTitle} | 五香ことり</title></svelte:head>

<div class="avatars-page min-h-screen bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-50">
  <SiteHeader current="avatars" />
  <main class="mx-auto max-w-[1320px] px-5 sm:px-6 lg:px-10">
    <Breadcrumb aria-label="パンくずリスト" class="breadcrumbs py-6 [&_ol]:flex-wrap">
      <BreadcrumbItem home href="/#Home">Home</BreadcrumbItem>
      <BreadcrumbItem href={avatarHref()} aria-current={!avatar && !notFound ? 'page' : undefined}>Avatars</BreadcrumbItem>
      {#if avatar}
        <BreadcrumbItem href={avatarHref(avatar.id)} aria-current={!theme && !notFound ? 'page' : undefined}>{avatar.name}</BreadcrumbItem>
      {/if}
      {#if theme}
        <BreadcrumbItem aria-current={!notFound ? 'page' : undefined}>{theme.name}</BreadcrumbItem>
      {/if}
    </Breadcrumb>

    {#if isSampleContent}
      <Alert color="primary" class="sample-note text-sm"><span class="mr-3 font-semibold tracking-widest">SAMPLE</span>構成確認用のサンプルです。</Alert>
    {/if}

    {#if notFound}
      <section class="empty-state py-20 [&_p]:my-5">
        <p class="eyebrow text-xs font-semibold tracking-widest text-primary-700 dark:text-primary-300">NOT FOUND</p>
        <h1 class="text-4xl font-medium tracking-tight leading-tight sm:text-5xl focus:outline-none" bind:this={pageHeading} tabindex="-1">ページが見つかりません</h1>
        <p>指定された素体・改変・バリエーションは見つかりませんでした。</p>
        <a class="text-link inline-flex items-center gap-7 border-b border-primary-700 py-2.5 text-sm dark:border-primary-300 text-primary-700 dark:text-primary-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-500" href={avatarHref()}>素体一覧へ戻る <span aria-hidden="true">↗</span></a>
      </section>
    {:else if !avatar}
      <section aria-labelledby="collection-title">
        <div class="collection-heading mt-9 mb-7 flex items-end justify-between gap-6 sm:mt-10 sm:mb-10 lg:mt-14">
          <div>
            <p class="eyebrow text-xs font-semibold tracking-widest text-primary-700 dark:text-primary-300">AVATAR COLLECTION</p>
            <h1 class="my-3 mb-6 text-6xl font-medium tracking-tight leading-none md:text-8xl focus:outline-none" id="collection-title" bind:this={pageHeading} tabindex="-1">Avatars<span class="title-dot text-primary-700 dark:text-primary-300">.</span></h1>
          </div>
          <p class="collection-count hidden gap-1 pb-1 text-right sm:grid [&_strong]:text-5xl [&_strong]:font-normal [&_span]:text-xs [&_span]:tracking-widest text-gray-600 dark:text-gray-400"><strong>{String(avatars.length).padStart(2, '0')}</strong><span>BASE AVATARS</span></p>
        </div>
        <div class="avatar-grid grid grid-cols-1 gap-9 sm:grid-cols-3 sm:gap-5 lg:gap-7">
          {#each avatars as item, index}
            <Card size="xl" class="avatar-card group gap-0 overflow-hidden p-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-500" href={avatarHref(item.id)} aria-label={`${item.name}の紹介と改変テーマを見る`}>
              <div class="portrait relative aspect-[4/5] overflow-hidden sm:aspect-[3/4] bg-gray-100 dark:bg-gray-700 [&_img]:h-full [&_img]:w-full [&_img]:object-cover [&_img]:transition-transform [&_img]:duration-300 [&_img]:group-hover:scale-105 motion-reduce:[&_img]:transition-none">
                <img src={photoUrl(item.photo)} alt={`${item.name}の代表写真${isSampleContent ? '（サンプル）' : ''}`} loading={index === 0 ? 'eager' : 'lazy'} />
                <span class="photo-index absolute top-4 left-4 rounded-full border border-white/25 bg-gray-900/75 px-3 py-1 text-xs tracking-widest text-white">{String(index + 1).padStart(2, '0')}</span>
                <span class="photo-action absolute right-4 bottom-4 grid size-10 place-items-center rounded-full bg-white/95 text-xl text-gray-900" aria-hidden="true">↗</span>
              </div>
              <div class="card-heading mt-4 mb-2 flex items-center justify-between gap-3 px-4 [&_h2]:text-2xl [&_h3]:text-2xl [&_span]:text-xs [&_span]:tracking-wide [&_span]:text-primary-700 dark:[&_span]:text-primary-300"><h2>{item.name}</h2><span>{item.themes.length} THEMES</span></div>
              <p class="px-4 pb-4 text-sm leading-relaxed text-gray-600 dark:text-gray-400">{item.caption}</p>
            </Card>
          {/each}
        </div>
      </section>
    {:else if !theme}
      <section class="base-hero mt-7 grid items-center gap-7 sm:mt-10 sm:grid-cols-2 sm:gap-8 lg:gap-18" aria-labelledby="base-title">
        <div class="base-photo overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-700 [&_img]:w-full [&_img]:h-[460px] [&_img]:max-h-[65vh] [&_img]:object-contain sm:[&_img]:h-[480px] lg:[&_img]:h-[570px]"><img src={photoUrl(avatar.photo)} alt={`${avatar.name}の代表的な改変`} /></div>
        <div class="base-copy min-w-0 [&_h1]:mt-3">
          <p class="eyebrow text-xs font-semibold tracking-widest text-primary-700 dark:text-primary-300">BASE AVATAR</p>
          <h1 class="text-4xl font-medium tracking-tight leading-tight sm:text-5xl focus:outline-none" id="base-title" bind:this={pageHeading} tabindex="-1">{avatar.name}</h1>
          <p class="tagline mt-4 mb-5 text-xl leading-relaxed sm:mt-6">{avatar.caption}</p>
          <p class="description max-w-2xl text-sm leading-loose text-gray-600 dark:text-gray-400">{avatar.description}</p>
          {#if avatar.sourceUrl}
            <dl class="mt-6 grid gap-2 text-sm">
              <dt class="text-gray-600 dark:text-gray-400">アバター商品URL</dt>
              <dd><a class="break-all leading-relaxed text-primary-700 underline underline-offset-4 dark:text-primary-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-500" href={avatar.sourceUrl} target="_blank" rel="noopener noreferrer">{avatar.sourceUrl} <span aria-hidden="true">↗</span><span class="sr-only">（新しいタブで開く）</span></a></dd>
            </dl>
          {/if}
          <div class="base-stats my-8 flex flex-wrap gap-7 border-t pt-6 border-gray-200 dark:border-gray-700 [&_span]:grid [&_span]:gap-2 [&_span]:text-xs [&_span]:text-gray-600 dark:[&_span]:text-gray-400 [&_strong]:text-3xl [&_strong]:font-normal [&_strong]:text-gray-900 dark:[&_strong]:text-gray-50"><span><strong>{String(avatar.themes.length).padStart(2, '0')}</strong>改変テーマ</span><span><strong>{String(outfitCount(avatar)).padStart(2, '0')}</strong>バリエーション</span></div>
          <a class="text-link inline-flex items-center gap-7 border-b border-primary-700 py-2.5 text-sm dark:border-primary-300 text-primary-700 dark:text-primary-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-500" href="#themes" onclick={(event) => { event.preventDefault(); document.getElementById('themes')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }); }}>改変テーマを見る <span aria-hidden="true">↓</span></a>
        </div>
      </section>
      <section id="themes" class="themes-section mt-12 scroll-mt-24 sm:mt-20" aria-labelledby="themes-title">
        <div class="section-heading mb-6 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end sm:gap-5 [&_h2]:mt-2 [&_h2]:text-3xl [&_h2]:font-medium"><div><p class="eyebrow text-xs font-semibold tracking-widest text-primary-700 dark:text-primary-300">CUSTOMIZATIONS</p><h2 id="themes-title">改変テーマ</h2></div></div>
        <div class="theme-grid grid gap-6 sm:grid-cols-2 sm:gap-7">
          {#each avatar.themes as item, index}
            <Card size="xl" class="theme-card group gap-0 overflow-hidden p-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-500" href={avatarHref(avatar.id, item.id)}>
              <div class="theme-photo relative aspect-[4/3] overflow-hidden bg-gray-100 dark:bg-gray-700 [&_img]:h-full [&_img]:w-full [&_img]:object-cover [&_img]:object-[50%_30%] [&_img]:transition-transform [&_img]:duration-300 [&_img]:group-hover:scale-105 motion-reduce:[&_img]:transition-none"><img src={photoUrl(item.photo)} alt={`${item.name}の代表写真`} loading="lazy" /><span class="theme-number absolute top-4 left-4 bg-gray-900/75 px-2 py-1 text-xs text-white">{String(index + 1).padStart(2, '0')}</span></div>
              <div class="theme-copy p-5 sm:p-6 [&_.card-heading]:mt-2 [&_.card-heading]:mb-3 [&_.card-heading]:px-0"><p class="eyebrow text-xs font-semibold tracking-widest text-primary-700 dark:text-primary-300">{item.label}</p><div class="card-heading mt-4 mb-2 flex items-center justify-between gap-3 px-4 [&_h2]:text-2xl [&_h3]:text-2xl [&_span]:text-xs [&_span]:tracking-wide [&_span]:text-primary-700 dark:[&_span]:text-primary-300"><h3>{item.name}</h3><span aria-hidden="true">↗</span></div><p class="muted text-sm leading-relaxed text-gray-600 dark:text-gray-400">{item.description}</p><span class="outfit-count mt-5 block text-xs text-primary-700 dark:text-primary-300">{item.outfits.length} バリエーション</span></div>
            </Card>
          {/each}
        </div>
      </section>
    {:else}
      <section aria-labelledby="theme-title">
        <div class="detail-heading mt-7 mb-8 sm:mt-10 [&_h1]:mt-3 [&_h1]:mb-5"><p class="eyebrow text-xs font-semibold tracking-widest text-primary-700 dark:text-primary-300">{avatar.name} / {theme.label}</p><h1 class="text-4xl font-medium tracking-tight leading-tight sm:text-5xl focus:outline-none" id="theme-title" bind:this={pageHeading} tabindex="-1">{theme.name}</h1><p class="description max-w-2xl text-sm leading-loose text-gray-600 dark:text-gray-400">{theme.description}</p></div>
        {#snippet themeCredits()}
        {#if theme.credits?.length}
          <section class="mt-7 border-t border-gray-200 pt-6 dark:border-gray-700" aria-labelledby="theme-credits-title">
            <h2 id="theme-credits-title" class="mb-3 text-sm font-semibold">改変テーマの使用商品</h2>
            <dl class="text-sm [&>div]:grid [&>div]:grid-cols-[90px_minmax(0,1fr)] [&>div]:gap-3 [&>div]:py-2 [&_dt]:text-gray-600 dark:[&_dt]:text-gray-400 [&_dd]:wrap-anywhere [&_a]:text-primary-700 dark:[&_a]:text-primary-300 [&_a]:underline [&_a]:focus-visible:outline-primary-500">
              {#each theme.credits as credit}
                <div><dt>{credit.category}</dt><dd>{#if credit.url}<a href={credit.url} target="_blank" rel="noopener noreferrer">{credit.name} ↗</a>{:else}{credit.name}{/if}</dd></div>
              {/each}
            </dl>
          </section>
        {/if}
        {/snippet}
        {#if outfit}
          <div class="outfit-layout grid items-start gap-6 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] sm:gap-7 lg:gap-12">
            <div class="outfit-photo overflow-hidden rounded-lg sm:sticky sm:top-22 bg-gray-100 dark:bg-gray-700 [&_img]:w-full [&_img]:h-[55vh] [&_img]:min-h-[300px] [&_img]:object-contain sm:[&_img]:h-[min(720px,78vh)]"><img src={photoUrl(outfit.photo)} alt={`${avatar.name}・${theme.name}・${outfit.name}`} /></div>
            <div class="outfit-panel min-w-0 pt-2">
              <p class="eyebrow text-xs font-semibold tracking-widest text-primary-700 dark:text-primary-300">VARIATIONS <span class="muted text-sm leading-relaxed text-gray-600 dark:text-gray-400">/ {String(theme.outfits.length).padStart(2, '0')}</span></p>
              <h2 class="wardrobe-title mt-2 mb-6 text-xl font-medium">バリエーション</h2>
              <nav class="outfit-options grid grid-cols-3 gap-3" aria-label="選択">
                {#each theme.outfits as item}
                  <a class="outfit-option min-w-0 rounded border p-1 border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-500 data-[selected=true]:border-primary-700 data-[selected=true]:ring-1 data-[selected=true]:ring-primary-700 dark:data-[selected=true]:border-primary-300 dark:data-[selected=true]:ring-primary-300 [&_img]:aspect-[3/4] [&_img]:w-full [&_img]:rounded-sm [&_img]:object-cover [&_span]:block [&_span]:px-0.5 [&_span]:pt-2 [&_span]:pb-1 [&_span]:text-xs [&_span]:leading-relaxed [&_span]:wrap-anywhere" data-selected={outfit.id === item.id} href={avatarHref(avatar.id, theme.id, item.id)} aria-current={outfit.id === item.id ? 'true' : undefined}>
                    <img src={photoUrl(item.photo, true)} alt="" loading="lazy" /><span>{item.name}</span>
                  </a>
                {/each}
              </nav>
              <div class="outfit-description mt-7 border-t pt-6 border-gray-200 dark:border-gray-700 [&_h2]:mt-2 [&_h2]:mb-4 [&_h2]:text-2xl [&_h2]:font-medium" aria-live="polite" aria-atomic="true"><span class="eyebrow text-xs font-semibold tracking-widest text-primary-700 dark:text-primary-300">SELECTED LOOK</span><h2>{outfit.name}</h2><p class="description max-w-2xl text-sm leading-loose text-gray-600 dark:text-gray-400">{outfit.description}</p></div>
              {@render themeCredits()}
              <div class="credits mt-7 border-t pt-6 border-gray-200 dark:border-gray-700 [&_h3]:mb-3 [&_h3]:text-sm [&_h3]:font-semibold [&_dl]:text-sm [&_dl>div]:grid [&_dl>div]:grid-cols-[90px_1fr] [&_dl>div]:gap-3 [&_dl>div]:py-2 [&_dt]:text-gray-600 dark:[&_dt]:text-gray-400 [&_a]:text-primary-700 dark:[&_a]:text-primary-300 [&_a]:underline [&_a]:focus-visible:outline-primary-500"><h3>使用商品</h3>
                {#if outfit.credits.length}
                  <dl>{#each outfit.credits as credit}<div><dt>{credit.category}</dt><dd>{#if credit.url}<a href={credit.url} target="_blank" rel="noopener noreferrer">{credit.name} ↗</a>{:else}{credit.name}{/if}</dd></div>{/each}</dl>
                {:else}<p class="muted text-sm leading-relaxed text-gray-600 dark:text-gray-400">使用商品・クレジットは準備中です。</p>{/if}
              </div>
            </div>
          </div>
          <ThreeView view={outfit.threeView} name={outfit.name} sample={isSampleContent} />
          <RelatedGallery {outfit} returnTo={`/avatars/${hash}`} />
        {:else}
          {@render themeCredits()}
          <p class="empty-state py-20 [&_p]:my-5">バリエーションの紹介は準備中です。</p>
        {/if}
        <div class="detail-back mt-10"><a class="text-link inline-flex items-center gap-7 border-b border-primary-700 py-2.5 text-sm dark:border-primary-300 text-primary-700 dark:text-primary-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-500" href={avatarHref(avatar.id)}>← {avatar.name}の改変テーマ一覧</a></div>
      </section>
    {/if}
    <Footer class="page-footer mt-14 flex flex-wrap items-center justify-between gap-5 rounded-none border-t bg-transparent px-0 py-7 shadow-none sm:mt-20 dark:bg-transparent border-gray-200 dark:border-gray-700 [&>a]:text-2xl [&>span]:text-xs [&>span]:text-gray-600 dark:[&>span]:text-gray-400"><a href={avatarHref()}>Avatars<span class="title-dot text-primary-700 dark:text-primary-300">.</span></a><span>五香ことり / Avatar Collection</span></Footer>
  </main>
</div>
