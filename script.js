// script.js
// Uses PlayerDB for username->UUID and Crafatar for skins/avatars.
// PlayerDB: https://playerdb.co/api/player/minecraft/<name>
// Crafatar: https://crafatar.com/avatars/<uuid>?size=80&overlay
// Crafatar skins: https://crafatar.com/skins/<uuid>

const loadBtn = document.getElementById('loadBtn');
const clearCacheBtn = document.getElementById('clearCacheBtn');
const namesInput = document.getElementById('names');
const gallery = document.getElementById('gallery');
const status = document.getElementById('status');

const PLAYERDB_BASE = 'https://playerdb.co/api/player/minecraft/';
const CRAFATAR_AVATAR = (uuid, size=80) => `https://crafatar.com/avatars/${uuid}?size=${size}&overlay`;
const CRAFATAR_SKIN = (uuid) => `https://crafatar.com/skins/${uuid}`;

// simple localStorage cache layer
const CACHE_KEY = 'mc_player_cache_v1';
const CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours

function loadCache(){
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if(!raw) return {};
    const parsed = JSON.parse(raw);
    // purge expired on load
    const now = Date.now();
    for(const k of Object.keys(parsed)){
      if(parsed[k].ts + CACHE_TTL_MS < now) delete parsed[k];
    }
    return parsed;
  } catch(e){ return {}; }
}

function saveCache(obj){
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(obj)); } catch(e){}
}

let cache = loadCache();

// concurrency-limited runner to avoid spikes
async function pMap(inputs, fn, concurrency = 6) {
  const results = [];
  let i = 0;
  const workers = new Array(concurrency).fill(null).map(async () => {
    while(true){
      const idx = i++;
      if(idx >= inputs.length) return;
      try {
        results[idx] = await fn(inputs[idx], idx);
      } catch(e) {
        results[idx] = { error: String(e) };
      }
    }
  });
  await Promise.all(workers);
  return results;
}

async function fetchPlayerInfo(username){
  const name = username.trim();
  if(!name) return { error: 'empty' };

  const key = `name:${name.toLowerCase()}`;
  if(cache[key]) return cache[key].v;

  // call PlayerDB
  const url = PLAYERDB_BASE + encodeURIComponent(name);
  const res = await fetch(url);
  if(!res.ok) {
    throw new Error(`PlayerDB error ${res.status}`);
  }
  const json = await res.json();
  if(!json || !json.data || !json.data.player){
    return { error: 'not found' };
  }
  const p = json.data.player; // { username, id, avatar, meta }
  const out = {
    name: p.username,
    uuid: p.id, // UUID with hyphens? playerdb returns hyphenless or hyphen? it's usually hyphenless; both work with crafatar
    avatar: CRAFATAR_AVATAR(p.id),
    skin: CRAFATAR_SKIN(p.id),
    meta: p.meta || {}
  };
  // store into cache
  cache[key] = { ts: Date.now(), v: out };
  saveCache(cache);
  return out;
}

function showStatus(txt){
  status.textContent = txt;
}

function renderCard(player){
  const div = document.createElement('div');
  div.className = 'card';
  if(player.error){
    div.innerHTML = `
      <div style="height:80px;margin-bottom:8px;display:flex;align-items:center;justify-content:center;color:#999">?</div>
      <div class="name">⚠ ${player.requested || 'unknown'}</div>
      <div class="uuid">${player.error}</div>
    `;
    return div;
  }
  div.innerHTML = `
    <img loading="lazy" src="${player.avatar}" alt="${player.name} avatar" width="80" height="80" />
    <div class="name">${player.name}</div>
    <div class="uuid">${player.uuid}</div>
    <a target="_blank" rel="noreferrer" href="${player.skin}">View raw skin</a>
  `;
  return div;
}

async function loadPlayersFromTextarea() {
  const raw = namesInput.value || '';
  const names = raw.split(',').map(s => s.trim()).filter(Boolean);
  if (names.length === 0) { showStatus('No names provided'); return; }
  showStatus('Loading skin...');

  try {
    const first = names[0]; // for simplicity, render first player only
    const data = await fetchPlayerInfo(first);
    const skinUrl = data.skin;

    const viewer = setupViewer();
    viewer.loadSkin(skinUrl);
    viewer.animation = new skinview3d.IdleAnimation();
    showStatus(`Rendered ${data.name}'s skin on a mannequin.`);
  } catch (err) {
    showStatus('Error loading: ' + err.message);
  }
}


  // check cache first and only fetch missing ones (but pMap fetch handles cache)
  try {
    const results = await pMap(names, async (name) => {
      try {
        const data = await fetchPlayerInfo(name);
        return { requested: name, ...data };
      } catch (err) {
        return { requested: name, error: err.message || String(err) };
      }
    }, 6);

    // render
    gallery.innerHTML = '';
    results.forEach(r => {
      gallery.appendChild(renderCard(r));
    });
    showStatus(`Loaded ${results.length} player(s). Cache TTL ${Math.round(CACHE_TTL_MS/3600000)}h`);
  } catch(e){
    showStatus('Error: ' + String(e));
  } finally {
    loadBtn.disabled = false;
  }
}

loadBtn.addEventListener('click', loadPlayersFromTextarea);
clearCacheBtn.addEventListener('click', () => {
  localStorage.removeItem(CACHE_KEY);
  cache = {};
  saveCache(cache);
  showStatus('Cache cleared');
});

// create viewer once
let viewer;
function setupViewer() {
  const container = document.getElementById("viewerContainer");
  container.innerHTML = ""; // clear existing canvas
  viewer = new skinview3d.SkinViewer({
    canvas: document.createElement("canvas"),
    width: container.clientWidth,
    height: container.clientHeight
  });
  container.appendChild(viewer.canvas);

  viewer.controls.enableZoom = false;
  viewer.zoom = 0.8;

  // Add basic animations
  viewer.animation = new skinview3d.WalkingAnimation();
  viewer.animation.speed = 1;
  return viewer;
}

