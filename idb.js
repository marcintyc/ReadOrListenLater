(function(){
  const DB_NAME = 'pocketlike-web-db';
  const DB_VERSION = 1;
  const STORE = 'articles';

  function openDb() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: 'id' });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function withStore(mode, fn) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const store = tx.objectStore(STORE);
      const request = fn(store);
      tx.oncomplete = () => resolve(request?.result);
      tx.onerror = () => reject(tx.error);
    });
  }

  async function saveArticle(article) {
    return withStore('readwrite', store => store.put(article));
  }

  async function getArticle(id) {
    return withStore('readonly', store => store.get(id));
  }

  async function getAllArticles() {
    return withStore('readonly', store => store.getAll());
  }

  async function deleteArticle(id) {
    return withStore('readwrite', store => store.delete(id));
  }

  async function clearAll() {
    return withStore('readwrite', store => store.clear());
  }

  window.WebArticleDB = { saveArticle, getArticle, getAllArticles, deleteArticle, clearAll };
})();