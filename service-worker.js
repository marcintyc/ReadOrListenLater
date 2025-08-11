const CACHE = 'read-listen-cache-v1';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './idb.js',
  './manifest.webmanifest'
];
self.addEventListener('install', (e)=>{
  e.waitUntil((async()=>{ const c=await caches.open(CACHE); await c.addAll(ASSETS); })());
});
self.addEventListener('activate', (e)=>{ e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', (e)=>{
  const url=new URL(e.request.url);
  const isAsset = ASSETS.some(a=>url.pathname.endsWith(a.replace('./','/'))) || url.origin===location.origin;
  if(isAsset){
    e.respondWith((async()=>{ const c=await caches.open(CACHE); const hit=await c.match(e.request); if(hit) return hit; const res=await fetch(e.request); c.put(e.request, res.clone()); return res; })());
    return;
  }
  // Runtime cache for audio (cross-origin ok if CORS)
  if(url.pathname.endsWith('.mp3')){
    e.respondWith((async()=>{ const c=await caches.open(CACHE); const hit=await c.match(e.request); if(hit) return hit; const res=await fetch(e.request, {mode:'cors'}); c.put(e.request, res.clone()); return res; })());
  }
});