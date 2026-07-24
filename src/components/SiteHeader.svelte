<script>
  import {
    DarkMode,
    Navbar,
    NavBrand,
    NavHamburger,
    NavLi,
    NavUl,
  } from 'flowbite-svelte';

  export let current = 'home';

  const activeUrl = current === 'gallery' ? '/gallery/' : '/#Home';
</script>

<header class="site-header">
  <Navbar
    fluid
    class="bg-white/95 px-3 backdrop-blur-md dark:bg-gray-800/95"
    navContainerClass="mx-auto max-w-[1360px]"
  >
    <NavBrand href="/#Home" aria-label="五香ことり ホーム">
      <span
        class="self-center whitespace-nowrap text-xl font-semibold tracking-tight text-gray-950 dark:text-white"
      >
        五香ことり
      </span>
    </NavBrand>
    <div class="flex items-center gap-1 md:order-2">
      <NavHamburger />
      <NavUl
        {activeUrl}
        classes={{
          ul: 'md:items-center md:gap-8',
          active:
            'border-primary-500 bg-transparent text-gray-950 md:border-b-2 md:px-0 md:py-[3px] dark:bg-transparent dark:text-white',
          nonActive:
            'border-transparent bg-transparent text-gray-600 hover:bg-transparent hover:text-gray-950 md:px-0 md:py-[3px] dark:text-gray-300 dark:hover:bg-transparent dark:hover:text-white',
        }}
      >
        <NavLi href="/#Home">Home</NavLi>
        <NavLi href="/#About">About</NavLi>
        <NavLi href="/#Links">Links</NavLi>
        <NavLi href="/gallery/">Gallery</NavLi>
      </NavUl>
      <DarkMode class="text-lg" />
    </div>
  </Navbar>
</header>

<style>
  .site-header {
    position: sticky;
    top: 0;
    z-index: 50;
  }
</style>
