# home-page

A lightweight, static homepage that replaces a broken new-tab extension. Built with plain HTML, CSS, and vanilla JavaScript. Works directly from `file://` without a web server.

**[▶ Live Demo on GitHub Pages](https://csonti04.github.io/home-page/)** — shows the page running with dummy data before you download it.

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
2. Replace `data/links.json` **and** `data/links.js` with your own backup (see format below).
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
  links.js          file:// fallback — mirrors links.json (see "file:// Compatibility" below)
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
| `icons` | Array of icon objects; each may have a `dataURL` (base64) or a `url` (external image URL) |

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

### With an external icon URL (e.g. Google favicon service)

```json
"user_app_0": "{\"name\": \"GitHub\", \"id\": \"user_app_0\", \"appLaunchUrl\": \"https://github.com\", \"enabled\": true, \"icons\": [{\"url\": \"https://www.google.com/s2/favicons?domain=github.com&sz=32\"}]}"
```

When no valid `dataURL` or `url` is found, the page generates an initials badge from the app name.

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
2. **Fallback:** If fetch fails, the page checks `window.LINKS_DATA` — set by `data/links.js`, which is included automatically and mirrors `data/links.json`.

This means the page works out of the box from `file://` in all modern browsers with no extra configuration.

### Keeping links.js in sync

`data/links.js` is a copy of `data/links.json` wrapped in a `window.LINKS_DATA = { ... };` assignment. Whenever you update your bookmarks in `links.json`, regenerate `links.js` with this one-liner (requires Node.js):

```sh
node -e "const d=require('./data/links.json'); require('fs').writeFileSync('./data/links.js', '// file:// fallback — mirrors data/links.json\nwindow.LINKS_DATA = ' + JSON.stringify(d, null, 2) + ';\n')"
```

Or on a Unix shell without Node.js:

```sh
printf 'window.LINKS_DATA = ' > data/links.js && cat data/links.json >> data/links.js && printf ';\n' >> data/links.js
```

### Hiding personal bookmarks from git

If you replace the sample data with personal bookmarks and do not want `data/links.js` tracked by git, add it back to `.gitignore`:

```
data/links.js
```

In that case `fetch()` remains the primary load path (works on GitHub Pages and `localhost`). For local `file://` use you will need to recreate `links.js` manually after each edit to `links.json`, or serve the repo locally:

```
npx serve .
# or
python -m http.server
```

**Chrome tip:** You can also launch Chrome with `--allow-file-access-from-files` to enable `fetch` from `file://`.

---

## Password Protection (GitHub Pages)

If you host this page publicly on GitHub Pages, you can hide your personal bookmarks behind a password. Your links are encrypted with AES-256-GCM and only decrypted in the browser after the correct password is entered. The encrypted file is safe to commit.

> **Security note:** This protects your bookmarks from casual discovery. The encryption is strong (AES-256-GCM with a PBKDF2-derived key), but a determined attacker who obtains the encrypted file could attempt an offline brute-force attack. Use a long passphrase to make that impractical.

### Setup

1. **Create your personal `data/links.json`** (see Quick Start above).

2. **Encrypt it** using the provided Node.js tool:

   ```sh
   node tools/encrypt-links.js
   ```

   You will be prompted for a password. The tool writes `data/links_encrypted.js`.

3. **Enable the password gate** in `script.js`:

   ```js
   ENCRYPT_DATA: true,
   ```

4. **Commit** `data/links_encrypted.js` (the encrypted file is safe to share).
   Make sure `data/links.json` and `data/links.js` remain gitignored (see `.gitignore`).

5. Push to `main` — GitHub Actions deploys the page automatically.

### How it works

- On page load, a password prompt is shown instead of your bookmarks.
- The password is used to derive an AES-256-GCM decryption key via PBKDF2 (100,000 iterations, SHA-256).
- If decryption succeeds (the GCM auth tag is valid), the links are rendered.
- A wrong password shows an error — nothing is decrypted.
- The decrypted data is cached in `sessionStorage` so you only need to enter the password once per browser tab.

### Re-encrypting after bookmark changes

Run the encrypt tool again whenever you update `data/links.json`:

```sh
node tools/encrypt-links.js
```

Then commit the updated `data/links_encrypted.js`.

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
