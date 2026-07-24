<script>
  import {
    Footer,
    FooterCopyright,
    Button,
    Card,
  } from "flowbite-svelte";
  import SiteHeader from "./components/SiteHeader.svelte";
</script>

<main>
  <div
    id="Home"
    class="relative flex min-h-screen flex-col mask-alpha mask-b-from-80% mask-b-to-transparent bg-scroll bg-cover bg-center bg-[url(/haed.jpg)]"
  >
    <div
      class="absolute inset-0 bg-black/25 pointer-events-none"
      aria-hidden="true"
    ></div>
    <SiteHeader current="home" />
    <div
      class="relative z-10 flex flex-1 flex-col items-center justify-center text-center"
    >
      <h1
        class="text-6xl md:text-8xl font-black text-white tracking-tighter [text-shadow:0_2px_12px_rgba(0,0,0,0.8)]"
      >
        五香ことり
      </h1>
    </div>
  </div>
  <section class="mt-10 flex md:justify-evenly px-4 md:px-0" id="About">
    <Card horizontal size="lg">
      <div class="m-6">
        <h5
          class="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white"
        >
          About Me
        </h5>
        <ul
          class="mb-3 leading-tight font-normal text-gray-700 dark:text-gray-400"
        >
          <li>名前：五香ことり</li>
          <li>誕生日：12月21日</li>
          <li>趣味：VRChat・WarThunder・カイロソフトゲー・細々としたツールの作成</li>
        </ul>
      </div>
    </Card>
  </section>
  <section class="mt-5 flex md:justify-evenly px-4 md:px-0" id="Links">
    <Card horizontal size="lg">
      <div class="m-6">
        <h5
          class="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white"
        >
          Links
        </h5>
        <div class="flex flex-wrap gap-3 mt-3">
          <Button
            outline
            href="https://vrchat.com/home/user/usr_fecef2b8-14c9-4270-b892-cfb61c71315e"
            pill
            class="p-4!"
            color="green"
            target="_blank"
            rel="noopener noreferrer"
            ><img src="/vrchat.ico" alt="Booth" class="w-5 h-5 mr-2" />VRChat</Button
          >
          <Button
            outline
            href="https://x.com/gokou_kotori"
            pill
            class="p-4!"
            color="green"
            target="_blank"
            rel="noopener noreferrer"
            ><i class="fa-brands fa-x-twitter w-5 h-5 mr-2" aria-hidden="true"
            ></i>Twitter</Button
          >
          <Button
            outline
            href="https://discordapp.com/users/308866208927842306"
            pill
            class="p-4!"
            color="green"
            target="_blank"
            rel="noopener noreferrer"
            ><i class="fa-brands fa-discord w-5 h-5 mr-2" aria-hidden="true"
            ></i>Discord</Button
          >
          <Button
            outline
            href="https://gokoukotori.booth.pm/"
            pill
            class="p-4!"
            color="green"
            target="_blank"
            rel="noopener noreferrer"
            ><img src="/booth.svg" alt="Booth" class="w-5 h-5 mr-2" />Booth
            Shop</Button
          >
          <Button
            outline
            href="https://vpm.gokoukotori.com/"
            pill
            class="p-4!"
            color="green"
            target="_blank"
            rel="noopener noreferrer"
            ><img src="/vpm.ico" alt="VPMパッケージ" class="w-5 h-5 mr-2" />
            VPMパッケージ</Button
          >
        </div>
      </div>
    </Card>
  </section>
  <Footer footerType="logo">
    <hr class="my-6 border-gray-200 sm:mx-auto lg:my-8 dark:border-gray-700" />
    <FooterCopyright href="https://x.com/gokou_kotori" by="五香ことり" />
  </Footer>
</main>
