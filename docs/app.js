'use strict';
let API_BASE = localStorage.getItem('apiBase') || '';

function uuidv4(){return([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g,c=>(c^crypto.getRandomValues(new Uint8Array(1))[0]&15>>c/4).toString(16));}

const ui = {
  urlInput: document.getElementById('url-input'),
  saveUrlBtn: document.getElementById('save-url-btn'),
  apiInput: document.getElementById('api-input'),
  saveApiBtn: document.getElementById('save-api-btn'),
  list: document.getElementById('articles-list'),
  empty: document.getElementById('empty-state'),
  player: document.getElementById('player'),
  playAllBtn: document.getElementById('play-all-btn'),
  clearAllBtn: document.getElementById('clear-all-btn'),
};

const state = { articles: [], objectUrls: new Map(), queue: [], nowPlayingId: null };

async function fetchJson(url, opts){ const res = await fetch(url, opts); if(!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); }

function setBusy(b){ ui.saveUrlBtn.disabled=b; ui.saveApiBtn.disabled=b; }

async function saveFromUrl(rawUrl) {
  const url = rawUrl?.trim(); if(!url) return alert('Enter URL');
  if (!API_BASE) return alert('Set Backend URL first');
  setBusy(true);
  try {
    const { title, text, audioUrl } = await fetchJson(`${API_BASE}/save`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url })
    });
    const audioRes = await fetch(audioUrl, { mode: 'cors' });
    const audioBlob = await audioRes.blob();
    const id = uuidv4();
    const article = { id, url, title, text, createdAt: Date.now(), hasAudio: true };
    await WebArticleDB.saveArticle({ ...article, audioBlob });
    state.articles.unshift(article);
    renderList();
  } catch(e){ alert(`Save failed: ${e.message}`); console.error(e);} finally { setBusy(false); }
}

function objectUrlFor(id, blob){ if(state.objectUrls.has(id)) return state.objectUrls.get(id); const u=URL.createObjectURL(blob); state.objectUrls.set(id,u); return u; }
function revokeObjectUrl(id){ const u=state.objectUrls.get(id); if(u){ URL.revokeObjectURL(u); state.objectUrls.delete(id);} }

async function loadArticles(){
  const recs = await WebArticleDB.getAllArticles();
  state.articles = recs.sort((a,b)=>b.createdAt-a.createdAt).map(r=>({ id:r.id, url:r.url, title:r.title, text:r.text, createdAt:r.createdAt, hasAudio:!!r.audioBlob }));
  renderList();
}

async function getAudioObjectUrl(id){ const rec = await WebArticleDB.getArticle(id); if(!rec?.audioBlob) return null; return objectUrlFor(id, rec.audioBlob); }

function renderList(){
  const hasAny = state.articles.length>0; ui.empty.classList.toggle('hidden', hasAny); ui.list.innerHTML='';
  for(const article of state.articles){
    const li = document.createElement('li'); li.className='article';
    const left=document.createElement('div');
    const title=document.createElement('div'); title.className='title'; title.textContent=article.title||'(untitled)';
    const meta=document.createElement('div'); meta.className='meta'; meta.textContent=new URL(article.url).hostname;
    left.append(title, meta);
    const controls=document.createElement('div'); controls.className='controls';
    const playBtn=document.createElement('button'); playBtn.textContent='Play'; playBtn.onclick=async()=>{ await playSingle(article.id); };
    const addBtn=document.createElement('button'); addBtn.className='secondary'; addBtn.textContent='Add to playlist'; addBtn.onclick=()=>enqueue(article.id);
    const viewBtn=document.createElement('button'); viewBtn.className='secondary'; viewBtn.textContent='Text'; viewBtn.onclick=()=>showTextModal(article);
    const delBtn=document.createElement('button'); delBtn.className='danger'; delBtn.textContent='Delete'; delBtn.onclick=async()=>{ await WebArticleDB.deleteArticle(article.id); revokeObjectUrl(article.id); state.articles=state.articles.filter(a=>a.id!==article.id); state.queue=state.queue.filter(id=>id!==article.id); if(state.nowPlayingId===article.id){ ui.player.pause(); ui.player.src=''; state.nowPlayingId=null; } renderList(); };
    controls.append(playBtn, addBtn, viewBtn, delBtn);
    li.append(left, controls);
    ui.list.appendChild(li);
  }
}

function enqueue(id){ state.queue.push(id); }
async function playSingle(id){ const url = await getAudioObjectUrl(id); if(!url) return alert('No audio'); ui.player.src=url; state.nowPlayingId=id; await ui.player.play(); }
async function playQueue(ids){ state.queue=[...ids]; await playNextInQueue(); }
async function playNextInQueue(){ const next=state.queue.shift(); if(!next) return; await playSingle(next); }

function showTextModal(article){ const w=window.open('', '_blank', 'width=720,height=800'); if(!w) return; const safe=(article.text||'').replaceAll('<','&lt;'); w.document.write(`<!doctype html><title>${article.title||'Text'}</title><style>body{font-family:system-ui,Inter,Arial;padding:16px;line-height:1.6;max-width:820px;margin:0 auto;color:#0f172a}</style><h2>${article.title||''}</h2><p style="color:#64748b;font-size:13px"><a href="${article.url}" target="_blank" rel="noreferrer noopener">${article.url}</a></p><pre style="white-space:pre-wrap">${safe}</pre>`); }

ui.saveUrlBtn.onclick = async()=>{ await saveFromUrl(ui.urlInput.value); ui.urlInput.value=''; };
ui.saveApiBtn.onclick = ()=>{ const v=ui.apiInput.value?.trim(); if(!v) return; API_BASE=v; localStorage.setItem('apiBase', v); };
ui.playAllBtn.onclick = ()=>{ const ids=state.articles.map(a=>a.id); playQueue(ids); };
ui.clearAllBtn.onclick = async()=>{ if(!confirm('Clear all?')) return; await WebArticleDB.clearAll(); for(const id of state.objectUrls.keys()) revokeObjectUrl(id); state.articles=[]; state.queue=[]; state.nowPlayingId=null; ui.player.pause(); ui.player.src=''; renderList(); };
ui.player.addEventListener('ended', ()=>{ playNextInQueue(); });

(async function init(){
  if(API_BASE) ui.apiInput.value=API_BASE;
  await loadArticles();
  if('serviceWorker' in navigator){ try{ await navigator.serviceWorker.register('./service-worker.js'); }catch(e){ console.warn('SW reg failed', e);} }
})();