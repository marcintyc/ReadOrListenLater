const API_BASE = 'http://localhost:3000';

// Simple UUID v4 generator for ids
function uuidv4() {
  return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  );
}

const ui = {
  urlInput: document.getElementById('url-input'),
  saveUrlBtn: document.getElementById('save-url-btn'),
  saveCurrentBtn: document.getElementById('save-current-btn'),
  list: document.getElementById('articles-list'),
  empty: document.getElementById('empty-state'),
  player: document.getElementById('player'),
  playAllBtn: document.getElementById('play-all-btn'),
  clearAllBtn: document.getElementById('clear-all-btn'),
};

const state = {
  articles: [],
  objectUrls: new Map(), // id -> objectURL
  queue: [],
  nowPlayingId: null,
};

async function fetchJson(url, opts) {
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function saveFromUrl(rawUrl) {
  const url = rawUrl?.trim();
  if (!url) return;
  setBusy(true);
  try {
    const { title, text, audioUrl } = await fetchJson(`${API_BASE}/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });

    const audioRes = await fetch(audioUrl);
    const audioBlob = await audioRes.blob();

    const id = uuidv4();
    const article = {
      id,
      url,
      title,
      text,
      createdAt: Date.now(),
      hasAudio: true,
    };

    await ArticleDB.saveArticle({ ...article, audioBlob });
    state.articles.unshift(article);
    renderList();
  } catch (e) {
    alert(`Błąd zapisu: ${e.message}`);
    console.error(e);
  } finally {
    setBusy(false);
  }
}

function setBusy(isBusy) {
  ui.saveUrlBtn.disabled = isBusy;
  ui.saveCurrentBtn.disabled = isBusy;
}

async function saveCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) return alert('Nie znaleziono aktywnej karty z adresem URL');
  await saveFromUrl(tab.url);
}

function objectUrlFor(id, blob) {
  if (state.objectUrls.has(id)) return state.objectUrls.get(id);
  const url = URL.createObjectURL(blob);
  state.objectUrls.set(id, url);
  return url;
}

function revokeObjectUrl(id) {
  const url = state.objectUrls.get(id);
  if (url) {
    URL.revokeObjectURL(url);
    state.objectUrls.delete(id);
  }
}

async function loadArticles() {
  const records = await ArticleDB.getAllArticles();
  // records contain blobs; keep a light-weight array in memory for UI
  state.articles = records
    .sort((a, b) => b.createdAt - a.createdAt)
    .map(r => ({ id: r.id, url: r.url, title: r.title, text: r.text, createdAt: r.createdAt, hasAudio: !!r.audioBlob }));
  renderList();
}

async function getAudioObjectUrl(id) {
  const record = await ArticleDB.getArticle(id);
  if (!record?.audioBlob) return null;
  return objectUrlFor(id, record.audioBlob);
}

function renderList() {
  const hasAny = state.articles.length > 0;
  ui.empty.classList.toggle('hidden', hasAny);
  ui.list.innerHTML = '';

  for (const article of state.articles) {
    const li = document.createElement('li');
    li.className = 'article';

    const left = document.createElement('div');
    const title = document.createElement('div');
    title.className = 'title';
    title.textContent = article.title || '(bez tytułu)';
    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.textContent = new URL(article.url).hostname;
    left.appendChild(title);
    left.appendChild(meta);

    const controls = document.createElement('div');
    controls.className = 'controls';

    const playBtn = document.createElement('button');
    playBtn.textContent = 'Odtwarzaj';
    playBtn.addEventListener('click', async () => {
      await playSingle(article.id);
    });

    const addToQueueBtn = document.createElement('button');
    addToQueueBtn.className = 'secondary';
    addToQueueBtn.textContent = 'Dodaj do playlisty';
    addToQueueBtn.addEventListener('click', () => {
      enqueue(article.id);
    });

    const viewBtn = document.createElement('button');
    viewBtn.className = 'secondary';
    viewBtn.textContent = 'Tekst';
    viewBtn.addEventListener('click', () => {
      showTextModal(article);
    });

    const delBtn = document.createElement('button');
    delBtn.className = 'danger';
    delBtn.textContent = 'Usuń';
    delBtn.addEventListener('click', async () => {
      await ArticleDB.deleteArticle(article.id);
      revokeObjectUrl(article.id);
      state.articles = state.articles.filter(a => a.id !== article.id);
      state.queue = state.queue.filter(id => id !== article.id);
      if (state.nowPlayingId === article.id) {
        ui.player.pause();
        ui.player.src = '';
        state.nowPlayingId = null;
      }
      renderList();
    });

    controls.append(playBtn, addToQueueBtn, viewBtn, delBtn);
    li.append(left, controls);
    ui.list.appendChild(li);
  }
}

function enqueue(id) {
  state.queue.push(id);
}

async function playSingle(id) {
  const url = await getAudioObjectUrl(id);
  if (!url) return alert('Brak audio dla tego artykułu');
  ui.player.src = url;
  state.nowPlayingId = id;
  await ui.player.play();
}

async function playQueue(ids) {
  state.queue = [...ids];
  await playNextInQueue();
}

async function playNextInQueue() {
  const nextId = state.queue.shift();
  if (!nextId) return; // done
  await playSingle(nextId);
}

function showTextModal(article) {
  const w = window.open('', '_blank', 'popup,width=520,height=600');
  if (!w) return;
  const safeText = (article.text || '').replaceAll('<', '&lt;');
  w.document.write(`
    <html><head><title>${article.title || 'Tekst'}</title>
    <style>body{font-family:system-ui,Inter,Arial;padding:16px;line-height:1.6;max-width:720px;margin:0 auto;color:#0f172a}</style>
    </head><body>
    <h2>${article.title || ''}</h2>
    <p style="color:#64748b;font-size:13px"><a href="${article.url}" target="_blank" rel="noreferrer noopener">${article.url}</a></p>
    <pre style="white-space:pre-wrap">${safeText}</pre>
    </body></html>
  `);
}

ui.saveUrlBtn.addEventListener('click', async () => {
  const url = ui.urlInput.value;
  await saveFromUrl(url);
  ui.urlInput.value = '';
});

ui.saveCurrentBtn.addEventListener('click', async () => {
  await saveCurrentTab();
});

ui.playAllBtn.addEventListener('click', () => {
  const ids = state.articles.map(a => a.id);
  playQueue(ids);
});

ui.clearAllBtn.addEventListener('click', async () => {
  if (!confirm('Na pewno usunąć wszystkie artykuły?')) return;
  await ArticleDB.clearAll();
  for (const id of state.objectUrls.keys()) revokeObjectUrl(id);
  state.articles = [];
  state.queue = [];
  state.nowPlayingId = null;
  ui.player.pause();
  ui.player.src = '';
  renderList();
});

ui.player.addEventListener('ended', () => {
  playNextInQueue();
});

// init
(async function init(){
  await loadArticles();
  try {
    const { pendingUrls } = await chrome.storage.local.get('pendingUrls');
    if (Array.isArray(pendingUrls) && pendingUrls.length > 0) {
      const unique = Array.from(new Set(pendingUrls));
      await chrome.storage.local.set({ pendingUrls: [] });
      for (const u of unique) {
        try { await saveFromUrl(u); } catch(e) { console.error(e); }
      }
    } else {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.url?.startsWith('http')) {
        ui.urlInput.placeholder = `Wklej link lub użyj: ${new URL(tab.url).hostname}`;
      }
    }
  } catch (_) {}
})();