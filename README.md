# Read & Listen (Pocket-like)

- Chrome extension (`/extension`) to save articles, clean content, and play TTS offline.
- Backend (`/backend`) with Express, Puppeteer, Readability, and ElevenLabs TTS.

## Deploy backend from GitHub (Render free tier)
1. Push this repo to GitHub.
2. In Render, create New + → Blueprint → connect your repo.
3. Render will detect `render.yaml` and create a web service from `backend/`.
4. Set env var `ELEVENLABS_API_KEY` (required). Optionally `ELEVENLABS_VOICE_ID`, `ELEVENLABS_MODEL_ID`.
5. After deploy, copy the public URL, e.g. `https://read-listen-backend.onrender.com`.

## Load the Chrome extension
- Open `chrome://extensions/` → Developer mode → Load unpacked → select `extension/`.
- In the popup Settings, paste your backend URL and click "Save backend URL".

## Using
- Click "Save current tab" or paste a URL.
- It cleans the content, synthesizes MP3 via ElevenLabs, downloads and stores it in IndexedDB.
- Offline playback works after saving.

## Web app on GitHub Pages
- This repo includes a PWA under `/docs` ready for GitHub Pages.
- Enable Pages (Settings → Pages → Branch: `main`, Folder: `/docs`).
- Open the Pages URL and set the backend URL in the app Settings.