import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { createCmsApi } from './api.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const port = Number(process.env.CMS_PORT || 5174);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('CMS_PORTが不正です。');
const origin = `http://127.0.0.1:${port}`;
const watchedRoot = root.replaceAll('\\', '/').replace(/\/$/, '');
const server = await createServer({
  root: fileURLToPath(new URL('../../site/', import.meta.url)),
  configFile: fileURLToPath(new URL('../../vite.config.js', import.meta.url)),
  define: { 'import.meta.env.VITE_GALLERY_IMAGE_BASE_URL': JSON.stringify('/__cms/media') },
  server: { host:'127.0.0.1', port, strictPort:true, cors:false, fs:{ deny:['.env', '.env.*', '*.{crt,pem}', '**/.git/**', '**/.cms/**'] }, watch:{ ignored:[`${watchedRoot}/.cms/**`,`${watchedRoot}/output/**`] } },
  plugins: [{ name:'local-cms-api', configureServer(vite) {
    vite.middlewares.use((req, res, next) => {
      if (req.headers.host !== `127.0.0.1:${port}`) { res.writeHead(403); return res.end('Local CMS only'); }
      if (/^\/(?:cms\/|__cms\/)/.test(req.url)) res.setHeader('Cache-Control', 'no-store');
      next();
    });
    vite.middlewares.use(createCmsApi(root, origin));
  } }],
});
await server.listen();
console.log(`Local CMS: ${origin}/cms/`);
