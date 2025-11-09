// script.js
// Renders multiple Minecraft skins onto 3D mannequins using skinview3d.
// Username -> UUID via PlayerDB, skins via Crafatar.
// Works on static hosts (GitHub Pages).

// Config
const PLAYERDB_BASE = 'https://playerdb.co/api/player/minecraft/';
const CRAFATAR_AVATAR = (uuid, size = 80) => `https://crafatar.com/avatars/${uuid}?size=${size}&overlay`;
const CRAFATAR_SKIN = (uuid) => `https://crafatar.com/skins/${uuid}`;
const CRAFATAR_RENDER = (uuid, size = 200) => `https://crafatar.com/renders/body/${uuid}?size=${size}&overlay`;

// Cache config
const CACHE_KEY = 'mc_mannequin_cache_v1';
const CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours

// UI elements
const loadBtn = document.getElementById('loadBtn');
const clearCacheBtn = document.getElementById('clearCacheBtn');
const namesInput = document.getElementById('names');
const viewGrid = document.getElementById('viewGrid');
const statusEl = document.getElementById('status');

let cache = loadCache();

function showStatus(txt) { statusEl.textContent = txt; }

// localStorage cache helpers
function loadCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    // purge expired
    const now = Date.now();
    Object.keys(parsed).forEach(k => {
      if (parsed[k].ts + CACHE_TTL_MS < now) delete parsed[k];
    });
    return parsed;
  } catch (e) { return {}; }
}
function saveCache() {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch (e) {}
}
function cacheSet(key, value) {
  cache[key] = { ts: Date.now(), v: value };
  saveCache();
}
function cacheGet(key) {
  return cache[key] ? cache[key].v : null;
}

// concurrency-limited mapping helper
async function pMap(inputs, mapper, concurrency = 5) {
  const results = new Array(inputs.length);
  let i = 0;
  const workers = new Array(concurrency).fill(null).map(async () => {
    while (true) {
      const idx = i++;
      if (idx >= inputs.length) return;
      try {
        results[idx] = await mapper(inputs[idx], idx);
      } catch (err) {
        results[idx] = { error: String(err) };
      }
    }
  });
  await Promise.all(workers);
  return results;
}

// Identify UUID-like strings (with or without dashes)
function looksLikeUuid(s) {
  if (!s) return false;
  const t = s.trim();
  return /^[0-9a-fA-F-]{32,36}$/.test(t);
}
function normalizeUuid(s) {
  return s.replace(/-/g, '').toLowerCase();
}

// Lookup via PlayerDB (username -> uuid + basic meta)
async function fetchPlayerdb(name) {
  const key = `name:${name.toLowerCase()}`;
  const cached = cacheGet(key);
  if (cached) return cached;

  const res = await fetch(PLAYERDB_BASE + encodeURIComponent(name));
  if (!res.ok) {
    // propagate status for better error messages
    throw new Error(`PlayerDB ${res.status}`);
  }
  const json = await res.json();
  if (!json || !json.data || !json.data.player) {
    throw new Error('player not found');
  }
  const p = json.data.player; // { username, id, avatar, meta }
  const out = {
    name: p.username,
    uuid: p.id, // playerdb returns hyphenless or hyphen? usually hyphenless works with Crafatar
    meta: p.meta || {}
  };
  cacheSet(key, out);
  return out;
}

// Build card DOM and viewer
function makeCardElement({ requested, name, uuid, skinUrl, avatarUrl, error }) {
  const card = document.createElement('article');
  card.className = 'card';

  // viewer container (for skinview3d canvas)
  const viewerWrap = document.createElement('div');
  viewerWrap.className = 'viewer-wrap';
  card.appendChild(viewerWrap);

  const title = document.createElement('div');
  title.className = 'player-name';
  title.textContent = name || requested || 'Unknown';
  card.appendChild(title);

  const uuidEl = document.createElement('div');
  uuidEl.className = 'player-uuid';
  uuidEl.textContent = uuid || '';
  card.appendChild(uuidEl);

  const links = document.createElement('div');
  links.className = 'links';
  // skin raw link
  if (skinUrl) {
    const a = document.createElement('a');
    a.href = skinUrl;
    a.target = '_blank';
    a.rel = 'noreferrer';
    a.textContent = 'Raw skin';
    links.appendChild(a);
  }
  // avatar / crafatar render link
  if (avatarUrl) {
    const b = document.createElement('a');
    b.href = avatarUrl;
    b.target = '_blank';
    b.rel = 'noreferrer';
    b.textContent = 'Avatar';
    links.appendChild(b);
  }
  // error message
  if (error) {
    const err = document.createElement('div');
    err.style.color = '#ffb4b4';
    err.style.fontSize = '13px';
    err.style.marginTop = '6px';
    err.textContent = String(error);
    card.appendChild(err);
  }

  card.appendChild(links);

  return { card, viewerWrap };
}

// Initialize a skinview3d viewer inside container and load skin url
function initSkinViewer(container, skinUrl, options = {}) {
  // ensure skinview3d global is loaded
  if (typeof skinview3d === 'undefined') {
    container.textContent = 'Renderer not loaded';
    return null;
  }

  // remove children
  container.innerHTML = '';
  const canvas = document.createElement('canvas');
  // set some reasonable size; skinview3d will scale canvas content
  canvas.width = container.clientWidth || 300;
  canvas.height = container.clientHeight || 260;

  const viewer = new skinview3d.SkinViewer({
    canvas,
    width: canvas.width,
    height: canvas.height
  });

  container.appendChild(viewer.canvas);

  // viewer settings
  viewer.background = options.background || null;
  viewer.zoom = options.zoom ?? 0.8;
  viewer.controls.enablePan = false;
  viewer.controls.enableZoom = true;
  viewer.autoRotate = options.autoRotate ?? true;
  viewer.autoRotateSpeed = options.autoRotateSpeed ?? 0.3;

  // load skin
  viewer.loadSkin(skinUrl).catch(err => {
    // on load error, show text
    container.innerHTML = 'Failed to load skin';
    console.warn('skin load fail', err);
  });

  // small resize observer so canvas keeps fit
  const ro = new ResizeObserver(() => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    viewer.width = w;
    viewer.height = h;
    viewer.canvas.width = w;
    viewer.canvas.height = h;
    viewer.updateSize();
  });
  ro.observe(container);

  return viewer;
}

// Main: resolves input (name or uuid) to data { requested, name, uuid, skinUrl, avatarUrl }
async function resolveEntry(entry) {
  const requested = entry.trim();
  if (!requested) return { requested, error: 'empty entry' };

  // if looks like uuid, skip PlayerDB
  if (looksLikeUuid(requested)) {
    const uuid = normalizeUuid(requested);
    // return minimal dat
    return {
      requested,
      name: uuid,
      uuid,
      skinUrl: CRAFATAR_SKIN(uuid),
      avatarUrl: CRAFATAR_AVATAR(uuid)
    };
  }

  // otherwise do name -> uuid via PlayerDB
  const cachedKey = `name:${requested.toLowerCase()}`;
  const cached = cacheGet(cachedKey);
  if (cached) {
    return {
      requested,
      name: cached.name,
      uuid: cached.uuid,
      skinUrl: CRAFATAR_SKIN(cached.uuid),
      avatarUrl: CRAFATAR_AVATAR(cached.uuid)
    };
  }

  try {
    const p = await fetchPlayerdb(requested);
    return {
      requested,
      name: p.name,
      uuid: p.uuid,
      skinUrl: CRAFATAR_SKIN(p.uuid),
      avatarUrl: CRAFATAR_AVATAR(p.uuid)
    };
  } catch (err) {
    return { requested, error: String(err) };
  }
}

// Render N entries into the grid
async function renderEntries(entries) {
  viewGrid.innerHTML = '';
  if (!entries || entries.length === 0) {
    showStatus('No entries to render');
    return;
  }

  showStatus(`Resolving ${entries.length} entries...`);
  loadBtn.disabled = true;

  // resolve with concurrency (pMap will call resolveEntry which uses cache)
  const resolved = await pMap(entries, resolveEntry, 5);

  showStatus('Rendering mannequins...');
  // for each result create a card, init viewer and load skin
  resolved.forEach(res => {
    const { card, viewerWrap } = makeCardElement(res);
    viewGrid.appendChild(card);

    if (res.error) {
      // no viewer if error
      viewerWrap.innerHTML = `<div style="color:#cfcfcf;font-size:13px">Error</div>`;
      return;
    }

    // try to initialize the skinview3d viewer
    initSkinViewer(viewerWrap, res.skinUrl, { autoRotate: true, zoom: 0.78 });
  });

  showStatus(`Rendered ${resolved.length} mannequins. (Cached: ${Object.keys(cache).length})`);
  loadBtn.disabled = false;
}

// Wire up UI
async function onLoadClick() {
  const raw = namesInput.value || '';
  const parts = raw.split(',').map(s => s.trim()).filter(Boolean);
  if (parts.length === 0) {
    showStatus('Please enter at least one username or UUID');
    return;
  }
  try {
    await renderEntries(parts);
  } catch (err) {
    console.error(err);
    showStatus('Error: ' + String(err));
    loadBtn.disabled = false;
  }
}

loadBtn.addEventListener('click', onLoadClick);
clearCacheBtn.addEventListener('click', () => {
  localStorage.removeItem(CACHE_KEY);
  cache = {};
  saveCache();
  showStatus('Cache cleared');
});
