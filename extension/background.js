const CACHE_NAME = 'pocketlike-cache-v1';
const ASSETS = [
  'popup.html',
  'popup.css',
  'popup.js',
  'idb.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    const urls = ASSETS.map(a => chrome.runtime.getURL(a));
    await cache.addAll(urls);
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const isExtensionAsset = url.origin === location.origin && ASSETS.some(a => url.pathname.endsWith(a));
  if (!isExtensionAsset) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(event.request);
    if (cached) return cached;
    const res = await fetch(event.request);
    cache.put(event.request, res.clone());
    return res;
  })());
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'save_article',
    title: 'Zapisz artykuł (Czytaj i Słuchaj)',
    contexts: ['page', 'link']
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'save_article') return;
  const url = info.linkUrl || info.pageUrl || tab?.url;
  if (!url) return;
  // send a message to popup if open; otherwise store temporarily
  const all = await chrome.storage.local.get('pendingUrls');
  const pending = Array.isArray(all.pendingUrls) ? all.pendingUrls : [];
  pending.push(url);
  await chrome.storage.local.set({ pendingUrls: pending });
  // Optionally show a basic notification
  if (chrome.notifications) {
    try {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: 'Dodano do kolejki zapisu',
        message: 'Otwórz popup, aby zapisać artykuł i pobrać audio.'
      });
    } catch (_) {}
  }
});