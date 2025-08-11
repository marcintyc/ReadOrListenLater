# Backend: Read & Listen (Pocket-like)

Express server exposes `POST /save` which:
- fetches the page via Puppeteer (`waitUntil: 'networkidle2'`),
- extracts clean text using Readability (JSDOM),
- synthesizes MP3 via ElevenLabs API, saves under `public/audio`,
- returns `{ title, text, audioUrl }`.

## Config
Environment variables:
- `ELEVENLABS_API_KEY` (required)
- `ELEVENLABS_VOICE_ID` (optional, default: Rachel `21m00Tcm4TlvDq8ikWAM`)
- `ELEVENLABS_MODEL_ID` (optional, default: `eleven_multilingual_v2`)
- `PORT` (optional)

## Quick start (local)
```
npm install
ELEVENLABS_API_KEY=your_key npm start
```
Server listens on `http://localhost:3000`.

## Deploy from GitHub (Railway/Render)
- Push this repo to GitHub.
- Create a new service from GitHub, select `/backend` as the root.
- Build command: `npm install`
- Start command: `node server.js`
- Add env var `ELEVENLABS_API_KEY`.
- After deploy, note the public URL, e.g. `https://your-app.up.railway.app`.

## Manual test
```
curl -X POST "$BASE/save" \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://example.com"}'
```