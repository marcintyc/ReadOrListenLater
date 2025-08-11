# Read & Listen Web App (PWA)

Static web app that connects to the backend (`/backend`) for scraping + TTS.

## Run on GitHub Pages
- Put this folder under `/docs` (already done).
- In your GitHub repo: Settings → Pages → Build from branch → Branch: `main`, Folder: `/docs`.
- Wait for Pages to publish (you'll get a URL like `https://USER.github.io/REPO/`).

## Configure Backend URL
- Open the web app URL.
- In Settings, set your backend URL (e.g., Render: `https://your-app.onrender.com`).
- Paste an article URL and click "Save from link".

## Offline
- The app shell is cached by Service Worker.
- Saved articles and MP3 are stored in IndexedDB; playback works offline once saved.