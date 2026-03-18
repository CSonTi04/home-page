# home-page

A lightweight, static homepage that replaces a broken new-tab extension. Built with plain HTML, CSS, and vanilla JavaScript. Works directly from `file://` without a web server.

## Features

- Loads links from a JSON backup file
- Flat grid of clickable link tiles with icon or initials-badge fallback
- Live clock with 24-hour time, full date, and weekday (Hungarian locale by default)
- Search bar with configurable search engine URL
- Dark mode by default, light/dark toggle persisted to `localStorage`
- Local background image with graceful fallback to CSS gradient
- Drag-and-drop tile reordering persisted to `localStorage`
- Reset layout button to restore the original order from JSON
- Works fully offline from `file://`

---

## Quick Start

1. Clone this repo.
2. Replace `data/links.json` with your own backup (see format below).
3. Optionally place a background image at `assets/background.jpg`.
4. Open `index.html` in your browser, or set it as your browser's homepage.

---

## File Structure

```
index.html          Main page
styles.css          All styles (dark/light themes, grid, tiles)
script.js           All logic (user config at the top)
data/
  links.json        Your links backup — the canonical data source
  links.js          Optional fallback for file:// (see below)
assets/
  background.jpg    Local background image (optional)
README.md
```

---

## Backup JSON Format

Your old extension backup is expected in this structure:

| Field | Description |
|---|---|
| `settings` | A JSON **string** with extension settings (parsed for reference, not required) |
| `icons_order` | Comma-separated list of app IDs — defines display order |
| `user_app_ids` | Comma-separated list of all app IDs |
| `user_app_0`, `user_app_1`, … | Each app as a JSON **string** |

Each app JSON string contains:

| Field | Description |
|---|---|
| `name` | Display name |
| `id` | Unique ID (must match keys in `icons_order` / `user_app_ids`) |
| `appLaunchUrl` | The URL to open |
| `enabled` | `true` or `false` — disabled apps are hidden |
| `icons` | Array of icon objects; each may have a `dataURL` with a base64 image |

### Minimal example

```json
{
  "settings": "{\"searchEnabled\": true}",
  "icons_order": "user_app_0,user_app_1",
  "user_app_ids": "user_app_0,user_app_1",
  "user_app_0": "{\"name\": \"GitHub\", \"id\": \"user_app_0\", \"appLaunchUrl\": \"https://github.com\", \"enabled\": true, \"icons\": []}",
  "user_app_1": "{\"name\": \"YouTube\", \"id\": \"user_app_1\", \"appLaunchUrl\": \"https://youtube.com\", \"enabled\": true, \"icons\": []}"
}
```

### With a base64 icon

```json
"user_app_0": "{\"name\": \"GitHub\", \"id\": \"user_app_0\", \"appLaunchUrl\": \"https://github.com\", \"enabled\": true, \"icons\": [{\"size\": 32, \"dataURL\": \"data:image/png;base64,...\"}]}"
```

When no valid `dataURL` is found, the page generates an initials badge from the app name.

---

## Configuration

All user-editable settings are at the top of `script.js` in the `CONFIG` object:

```js
const CONFIG = {
  JSON_PATH: './data/links.json',        // Path to your backup JSON
  BACKGROUND_IMAGE: './assets/background.jpg', // Local background (null to disable)
  ONLINE_BACKGROUND_ENABLED: false,      // Try a daily online background image
  ONLINE_BACKGROUND_URL: 'https://picsum.photos/1920/1080',
  BACKGROUND_OVERLAY_OPACITY: 0.55,     // Dim overlay for readability
  SEARCH_URL_TEMPLATE: 'https://www.google.com/search?q=%s',
  LOCALE: 'hu-HU',
  DEFAULT_THEME: 'dark',
};
```

### Changing the Search Engine

> **Note:** Browsers do not expose their default search engine to plain local HTML pages via any API. The `SEARCH_URL_TEMPLATE` approach is the correct practical workaround.

Change `SEARCH_URL_TEMPLATE` in `CONFIG`:

| Engine | URL Template |
|---|---|
| Google | `https://www.google.com/search?q=%s` |
| DuckDuckGo | `https://duckduckgo.com/?q=%s` |
| Bing | `https://www.bing.com/search?q=%s` |
| Startpage | `https://www.startpage.com/search?q=%s` |

### Background Image

Place your image at `assets/background.jpg`. To use a different path or file name, update `BACKGROUND_IMAGE` in `CONFIG`.

Fallback order:
1. Local image (`BACKGROUND_IMAGE`)
2. Online daily image (only if `ONLINE_BACKGROUND_ENABLED: true`)
3. CSS gradient (always available)

### Theme

Dark is the default. Click ☀️ / 🌙 to toggle. The choice is saved in `localStorage`.

---

## file:// Compatibility

`fetch()` from `file://` URLs may be blocked by some browsers (notably Chromium-based browsers with default settings). The page uses a two-step fallback:

1. **Primary:** `fetch('./data/links.json')` — works in Firefox and when served via `localhost`.
2. **Fallback:** If fetch fails, the page checks `window.LINKS_DATA` — a global variable you can set via `data/links.js`.

### Setting Up the JS Fallback

If `fetch` does not work in your browser from `file://`:

1. Create `data/links.js`:
   ```js
   window.LINKS_DATA = {
     // paste the contents of your links.json here
   };
   ```
2. Uncomment this line in `index.html`:
   ```html
   <script src="./data/links.js"></script>
   ```

The `data/links.js` file is listed in `.gitignore` by default (it may contain personal bookmarks). `data/links.json` is the canonical, version-controlled source.

**Chrome tip:** You can launch Chrome with `--allow-file-access-from-files` to enable `fetch` from `file://`. Alternatively, serve the repo locally:
```
npx serve .
# or
python -m http.server
```

---

## Drag-and-Drop Layout

- Drag tiles to reorder them.
- The new order is saved in `localStorage`.
- Click **↺ Reset layout** to clear the saved order and restore the original `icons_order` from the JSON file.

---

## Migration from Old Extension

1. Export your extension backup to a `.json` file.
2. Save it as `data/links.json` (replacing the sample file).
3. The page automatically parses the nested JSON structure — no manual conversion needed.
4. Apps with `"enabled": false` are silently hidden.
5. Apps without icon data get an auto-generated initials badge.

---

## Browser Support

Any modern browser (Chrome 90+, Firefox 90+, Edge 90+, Safari 15+). Requires ES2020 support (async/await, optional chaining).
