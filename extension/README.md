# Extension: Read & Listen

## Install (developer mode)
1. Open Chrome → `chrome://extensions/`.
2. Enable Developer mode.
3. Click "Load unpacked" and select `/workspace/extension`.
4. Click the extension icon to open the popup.

## Usage
- "Save current tab" saves the current page.
- Paste any URL and click "Save from link".
- Use the Settings box to set your backend URL (e.g. Railway/Render URL). It is stored in `chrome.storage`.
- The list shows titles with buttons: Play, Add to playlist, Text, Delete.
- "Play playlist" plays all saved articles in order.
- Offline: after saving, text and audio are stored in IndexedDB; popup assets are cached for offline.

## Backend
Set the backend public URL in the popup (e.g. `https://your-app.up.railway.app`).