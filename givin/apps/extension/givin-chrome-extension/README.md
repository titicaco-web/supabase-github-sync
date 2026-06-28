# Givin — Chrome extension

Adds a **"Send a gift"** button on any LinkedIn profile. Click it and the Givin web app
opens, pre-filled with that person's name — so you can send them a gift in seconds.

This is a deliberately simple "launcher": it only reads the visible name on the profile
you're looking at, on your click. It never reads your connections, runs in the background,
or messages anyone. That keeps LinkedIn accounts safe.

> This folder is ready to **load unpacked** — no build step, no npm, nothing to compile.

## Install (1 minute)

1. **Download / clone** this folder so you have it on your computer.
2. Open `config.js` and set your web app's address on the one line:
   ```js
   window.GIVIN_WEB_URL = "https://your-app.lovable.app";
   ```
   (Use `http://localhost:5173` while developing, or your live `givin.app` URL.)
3. Open **`chrome://extensions`** in Chrome.
4. Turn on **Developer mode** (top-right toggle).
5. Click **Load unpacked** and select **this folder**.
6. Go to any LinkedIn profile — the coral **“Send a gift”** button appears bottom-right.

To update after changing a file: come back to `chrome://extensions` and click the
**refresh ↻** icon on the Givin card.

## What's in here

| File | What it does |
|------|--------------|
| `manifest.json` | Extension definition (Manifest V3) |
| `config.js` | **The one file you edit** — your web app URL |
| `content.js` | Injects the "Send a gift" button on profiles |
| `content.css` | Button styling (Givin smile + raspberry) |
| `popup.html` | The little panel shown when you click the toolbar icon |
| `icons/` | Toolbar icons (16 / 48 / 128 px) |

## Notes

- Works on `https://www.linkedin.com/*` only.
- No permissions beyond running on LinkedIn pages — it requests nothing else.
- Pairs with the Givin web app (this repo's `apps/web`). The button opens
  `<WEB_URL>/send?name=...` which the app reads to pre-fill the gift.
