// ============================================================
// USER CONFIGURATION — edit these values to customize your page
// ============================================================
const CONFIG = {
  // Path to your links backup JSON file (relative to index.html)
  JSON_PATH: './data/links.json',

  // Local background image path. Set to null or '' to disable.
  BACKGROUND_IMAGE: './assets/background.jpg',

  // Set to true to attempt loading a daily background from an online source.
  // This fails gracefully if offline or blocked by file:// restrictions.
  ONLINE_BACKGROUND_ENABLED: true,

  // URL for the online background (only used when ONLINE_BACKGROUND_ENABLED is true)
  ONLINE_BACKGROUND_URL: 'https://picsum.photos/1920/1080',

  // Background overlay opacity for readability (0 = none, 1 = fully opaque)
  BACKGROUND_OVERLAY_OPACITY: 0.55,

  // Search engine URL template. %s is replaced with the encoded query string.
  //
  // NOTE: There is no browser API that exposes the user's default search engine
  // to a plain local HTML page. This configurable template is the correct
  // practical solution. Change the URL to switch engines.
  //
  //   Google:     "https://www.google.com/search?q=%s"
  //   DuckDuckGo: "https://duckduckgo.com/?q=%s"
  //   Bing:       "https://www.bing.com/search?q=%s"
  //   Startpage:  "https://www.startpage.com/search?q=%s"
  SEARCH_URL_TEMPLATE: 'https://www.google.com/search?q=%s',

  // Locale used for date and time formatting (BCP 47 language tag)
  LOCALE: 'hu-HU',

  // Default theme: 'dark' or 'light'
  // System preference is used as a hint, but 'dark' wins if no stored preference exists.
  DEFAULT_THEME: 'dark',

  // Maximum number of bookmark tiles to show per row on wide screens.
  // The grid will use fewer columns on narrower viewports so tiles never shrink
  // below a comfortable minimum width (~70 px).  Raise or lower this to taste.
  ITEMS_PER_ROW: 8,

  // Password-protected mode.
  // Set to true to enable the password gate and hide bookmarks behind a password prompt.
  // Requires data/links_encrypted.js — generate it with: node tools/encrypt-links.js
  // When false (default) the page behaves exactly as before.
  ENCRYPT_DATA: false,
};

// ============================================================
// THEME
// ============================================================

function getInitialTheme() {
  const stored = localStorage.getItem('theme');
  if (stored === 'dark' || stored === 'light') return stored;
  // Use system preference only as a fallback hint; still honour DEFAULT_THEME
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
    return CONFIG.DEFAULT_THEME === 'light' ? 'light' : 'dark';
  }
  return CONFIG.DEFAULT_THEME;
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  localStorage.setItem('theme', next);
  applyTheme(next);
}

// ============================================================
// BACKGROUND
// ============================================================

function applyLocalBackground(path) {
  const img = new Image();
  img.onload = () => {
    document.body.style.backgroundImage = `url('${path}')`;
  };
  img.onerror = () => {
    console.warn(`[HomePage] Local background not found: ${path}`);
    if (CONFIG.ONLINE_BACKGROUND_ENABLED) {
      applyOnlineBackground();
    }
    // CSS gradient fallback is already defined in :root
  };
  img.src = path;
}

function applyOnlineBackground() {
  const img = new Image();
  img.onload = () => {
    document.body.style.backgroundImage = `url('${img.src}')`;
  };
  img.onerror = () => {
    console.warn('[HomePage] Online background failed, using CSS gradient fallback.');
  };
  img.src = CONFIG.ONLINE_BACKGROUND_URL;
}

function initBackground() {
  if (CONFIG.BACKGROUND_IMAGE) {
    applyLocalBackground(CONFIG.BACKGROUND_IMAGE);
  } else if (CONFIG.ONLINE_BACKGROUND_ENABLED) {
    applyOnlineBackground();
  }
  // CSS gradient is always the base fallback via the body background-image CSS variable
}

// ============================================================
// CLOCK / DATE
// ============================================================

function updateClock() {
  const now = new Date();

  const timeEl = document.getElementById('clock-time');
  if (timeEl) {
    timeEl.textContent = now.toLocaleTimeString(CONFIG.LOCALE, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  }

  const dateEl = document.getElementById('clock-date');
  if (dateEl) {
    dateEl.textContent = now.toLocaleDateString(CONFIG.LOCALE, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  const dayEl = document.getElementById('clock-day');
  if (dayEl) {
    dayEl.textContent = now.toLocaleDateString(CONFIG.LOCALE, { weekday: 'long' });
  }
}

function initClock() {
  updateClock();
  setInterval(updateClock, 1000);
}

// ============================================================
// DATA LOADING
// ============================================================

/**
 * Load links data.
 *
 * Strategy (for file:// compatibility):
 *   1. Try fetch(JSON_PATH) — works in Firefox and when served via localhost.
 *   2. If fetch fails, check window.LINKS_DATA — set by data/links.js (optional fallback).
 *
 * See README for instructions on enabling the JS fallback.
 */
async function loadLinksData() {
  try {
    const resp = await fetch(CONFIG.JSON_PATH);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return await resp.json();
  } catch (err) {
    console.warn(`[HomePage] fetch('${CONFIG.JSON_PATH}') failed: ${err.message}`);
    if (typeof window.LINKS_DATA !== 'undefined') {
      console.info('[HomePage] Using window.LINKS_DATA fallback (data/links.js).');
      return window.LINKS_DATA;
    }
    console.error('[HomePage] No link data available. See README for setup instructions.');
    return null;
  }
}

// ============================================================
// PARSING THE BACKUP FORMAT
// ============================================================

function safeParseJSON(str, label) {
  try {
    return JSON.parse(str);
  } catch (e) {
    console.warn(`[HomePage] Skipping malformed JSON for "${label}": ${e.message}`);
    return null;
  }
}

function splitIdList(str) {
  if (typeof str !== 'string') return [];
  return str.split(',').map(s => s.trim()).filter(Boolean);
}

function parseBackup(raw) {
  if (!raw || typeof raw !== 'object') return [];

  const iconsOrder = splitIdList(raw.icons_order);
  const userAppIds = splitIdList(raw.user_app_ids);

  // Collect all user_app_* entries (skip known metadata keys)
  const META_KEYS = new Set(['settings', 'icons_order', 'user_app_ids']);
  const appMap = {};
  for (const key of Object.keys(raw)) {
    if (META_KEYS.has(key)) continue;
    if (!key.startsWith('user_app_')) continue;
    const val = raw[key];
    if (typeof val !== 'string') continue;
    const app = safeParseJSON(val, key);
    if (!app || !app.id || !app.appLaunchUrl) {
      console.warn(`[HomePage] Skipping invalid app entry: ${key}`);
      continue;
    }
    appMap[app.id] = app;
  }

  // Keep only enabled apps
  const enabled = Object.values(appMap).filter(app => app.enabled !== false);

  // Sort by icons_order; fall back to user_app_ids order; unknown go to the end
  const orderedIds = iconsOrder.length ? iconsOrder : userAppIds;
  enabled.sort((a, b) => {
    const ai = orderedIds.indexOf(a.id);
    const bi = orderedIds.indexOf(b.id);
    if (ai === -1 && bi === -1) return 0;
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  return enabled;
}

// ============================================================
// RENDERING TILES
// ============================================================

function getIconUrl(app) {
  if (!Array.isArray(app.icons)) return null;
  for (const icon of app.icons) {
    if (icon && icon.dataURL) return icon.dataURL;
    if (icon && icon.url) return icon.url;
  }
  return null;
}

function makeInitialsBadge(name) {
  const initials = (name || '?')
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0] || '')
    .join('')
    .toUpperCase();
  // Return a span element (created safely, no innerHTML)
  const span = document.createElement('span');
  span.className = 'tile-initials';
  span.setAttribute('aria-hidden', 'true');
  span.textContent = initials || '?';
  return span;
}

function renderTile(app) {
  // Use a real <a> element so browser-native link behaviour works:
  // left-click → same tab, middle-click / ctrl+click → new tab
  const a = document.createElement('a');
  a.href = app.appLaunchUrl;
  a.className = 'tile';
  a.dataset.id = app.id;
  a.draggable = true;

  const iconWrap = document.createElement('div');
  iconWrap.className = 'tile-icon-wrap';

  const iconUrl = getIconUrl(app);
  if (iconUrl) {
    const img = document.createElement('img');
    img.className = 'tile-icon';
    img.src = iconUrl;
    img.alt = '';
    img.loading = 'lazy';
    img.onerror = () => {
      // Replace broken image with initials badge
      iconWrap.replaceChildren(makeInitialsBadge(app.name));
    };
    iconWrap.appendChild(img);
  } else {
    iconWrap.appendChild(makeInitialsBadge(app.name));
  }

  const nameSpan = document.createElement('span');
  nameSpan.className = 'tile-name';
  nameSpan.textContent = app.name || '';

  a.appendChild(iconWrap);
  a.appendChild(nameSpan);
  return a;
}

function renderGrid(apps) {
  const grid = document.getElementById('grid');
  if (!grid) return;
  grid.replaceChildren(...apps.map(renderTile));
  updateGridColumns(); // reapply column count after re-render
}

// ============================================================
// RESPONSIVE GRID — reactive column count
// ============================================================

// Minimum tile width (px) used for the column-count heuristic.
// Keep in sync with the minmax fallback value in the #grid CSS rule.
const MIN_TILE_WIDTH = 70;

function updateGridColumns() {
  const grid = document.getElementById('grid');
  if (!grid) return;
  // getComputedStyle returns the resolved pixel value (e.g. "12px" for 0.75rem).
  // Fall back to 12 (= 0.75rem at 16px base) only if parsing fails.
  const gapPx = parseFloat(getComputedStyle(grid).gap) || 12;
  const containerWidth = grid.clientWidth;
  // How many columns of at least MIN_TILE_WIDTH fit in the available width?
  const maxByWidth = Math.floor((containerWidth + gapPx) / (MIN_TILE_WIDTH + gapPx));
  const cols = Math.max(1, Math.min(maxByWidth, CONFIG.ITEMS_PER_ROW));
  grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
}

function initResponsiveGrid() {
  updateGridColumns();
  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(updateGridColumns);
    const grid = document.getElementById('grid');
    if (grid) ro.observe(grid);
  } else {
    window.addEventListener('resize', updateGridColumns);
  }
}

// ============================================================
// DRAG-AND-DROP REORDERING
// ============================================================

const STORAGE_KEY_ORDER = 'tile_order';
let dragSrc = null;

function persistOrder() {
  const grid = document.getElementById('grid');
  if (!grid) return;
  const ids = Array.from(grid.querySelectorAll('.tile')).map(el => el.dataset.id);
  localStorage.setItem(STORAGE_KEY_ORDER, JSON.stringify(ids));
}

function applyStoredOrder(apps) {
  const stored = localStorage.getItem(STORAGE_KEY_ORDER);
  if (!stored) return apps;
  let order;
  try {
    order = JSON.parse(stored);
    if (!Array.isArray(order)) return apps;
  } catch {
    return apps;
  }
  const map = Object.fromEntries(apps.map(a => [a.id, a]));
  const sorted = order.map(id => map[id]).filter(Boolean);
  // Append any apps not present in the stored order
  const inOrder = new Set(order);
  for (const app of apps) {
    if (!inOrder.has(app.id)) sorted.push(app);
  }
  return sorted;
}

function initDragAndDrop() {
  const grid = document.getElementById('grid');
  if (!grid) return;

  grid.addEventListener('dragstart', (e) => {
    const tile = e.target.closest('.tile');
    if (!tile) return;
    dragSrc = tile;
    e.dataTransfer.effectAllowed = 'move';
    // Delay adding class so the drag ghost doesn't capture the dimmed style
    requestAnimationFrame(() => tile.classList.add('dragging'));
  });

  grid.addEventListener('dragend', () => {
    if (dragSrc) dragSrc.classList.remove('dragging');
    dragSrc = null;
    grid.querySelectorAll('.tile.drag-over').forEach(t => t.classList.remove('drag-over'));
  });

  grid.addEventListener('dragover', (e) => {
    e.preventDefault();
    const tile = e.target.closest('.tile');
    if (!tile || tile === dragSrc) return;
    e.dataTransfer.dropEffect = 'move';
    grid.querySelectorAll('.tile.drag-over').forEach(t => t.classList.remove('drag-over'));
    tile.classList.add('drag-over');
  });

  grid.addEventListener('dragleave', (e) => {
    const tile = e.target.closest('.tile');
    // Only remove if leaving the tile entirely (not a child element)
    if (tile && !tile.contains(e.relatedTarget)) {
      tile.classList.remove('drag-over');
    }
  });

  grid.addEventListener('drop', (e) => {
    e.preventDefault();
    const target = e.target.closest('.tile');
    if (!target || !dragSrc || target === dragSrc) return;
    target.classList.remove('drag-over');
    // Insert before or after target based on horizontal cursor position
    const rect = target.getBoundingClientRect();
    if (e.clientX < rect.left + rect.width / 2) {
      grid.insertBefore(dragSrc, target);
    } else {
      grid.insertBefore(dragSrc, target.nextSibling);
    }
    persistOrder();
  });
}

// ============================================================
// SEARCH
// ============================================================

function initSearch() {
  const form = document.getElementById('search-form');
  const input = document.getElementById('search-input');
  if (!form || !input) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const query = input.value.trim();
    if (!query) return;
    const url = CONFIG.SEARCH_URL_TEMPLATE.replace('%s', encodeURIComponent(query));
    window.location.href = url;
  });

  // Autofocus the search input on load
  input.focus();
}

// ============================================================
// CRYPTO — AES-256-GCM via Web Crypto API (used when ENCRYPT_DATA is true)
// ============================================================

// Number of PBKDF2 iterations for key derivation. Matches tools/encrypt-links.js.
const PBKDF2_ITERATIONS = 100_000;
// sessionStorage key for the cached (already-decrypted) data within a browser tab.
const STORAGE_KEY_SESSION = 'hp_session';

function b64ToBytes(b64) {
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
}

async function deriveKey(password, salt) {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt'],
  );
}

/**
 * Decrypt the payload produced by tools/encrypt-links.js.
 * payload = { salt: base64, iv: base64, ciphertext: base64 }
 * The ciphertext includes the 16-byte GCM auth tag appended at the end.
 * Throws a DOMException if the password is wrong (auth tag mismatch).
 */
async function decryptLinks(password, payload) {
  const salt = b64ToBytes(payload.salt);
  const iv   = b64ToBytes(payload.iv);
  const data = b64ToBytes(payload.ciphertext);
  const key  = await deriveKey(password, salt);
  const plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
  return JSON.parse(new TextDecoder().decode(plainBuf));
}

// ============================================================
// PASSWORD GATE
// ============================================================

function showPasswordGate() {
  const gate = document.getElementById('password-gate');
  if (gate) gate.hidden = false;
}

function hidePasswordGate() {
  const gate = document.getElementById('password-gate');
  if (gate) gate.hidden = true;
}

/**
 * Show the password prompt and call onUnlock(data) once the correct password
 * is entered.  If the current session already has a cached plaintext (from a
 * previous unlock in this tab), onUnlock is called immediately without showing
 * the gate.
 */
function initPasswordGate(onUnlock) {
  // Re-use cached data for the lifetime of the current tab.
  const cached = sessionStorage.getItem(STORAGE_KEY_SESSION);
  if (cached) {
    try {
      onUnlock(JSON.parse(cached));
      return;
    } catch {
      sessionStorage.removeItem(STORAGE_KEY_SESSION);
    }
  }

  showPasswordGate();
  requestAnimationFrame(() => document.getElementById('password-input')?.focus());

  const form  = document.getElementById('password-form');
  const input = document.getElementById('password-input');
  const error = document.getElementById('password-error');
  const btn   = form?.querySelector('button[type="submit"]');
  if (!form || !input) return;

  // Guard against adding the listener more than once (e.g. reset-layout re-calls main()).
  if (form.dataset.listenerBound) return;
  form.dataset.listenerBound = 'true';

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = input.value;
    if (!password) return;

    if (btn)   btn.disabled = true;
    if (error) error.hidden = true;

    try {
      const data = await decryptLinks(password, window.ENCRYPTED_LINKS);
      sessionStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(data));
      hidePasswordGate();
      onUnlock(data);
    } catch {
      if (error) error.hidden = false;
      if (btn)   btn.disabled = false;
      input.select();
    }
  });
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  if (CONFIG.ENCRYPT_DATA && typeof window.ENCRYPTED_LINKS !== 'undefined') {
    // Password-protected mode: gate is shown; onUnlock fires after correct password.
    initPasswordGate((raw) => {
      let apps = raw ? parseBackup(raw) : [];
      apps = applyStoredOrder(apps);
      renderGrid(apps);
    });
  } else {
    const raw = await loadLinksData();
    let apps = raw ? parseBackup(raw) : [];
    apps = applyStoredOrder(apps);
    renderGrid(apps);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  applyTheme(getInitialTheme());
  initBackground();
  initClock();
  initSearch();
  initDragAndDrop();
  initResponsiveGrid();
  main();

  document.getElementById('theme-toggle')?.addEventListener('click', toggleTheme);
  document.getElementById('reset-layout')?.addEventListener('click', () => {
    localStorage.removeItem(STORAGE_KEY_ORDER);
    main();
  });
});
