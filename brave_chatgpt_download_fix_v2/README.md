# ChatGPT Download Rescue - Brave v0.2.0

Higher-grade Brave/Chromium MV3 build adapted from the uploaded Firefox-oriented extension.

## What was upgraded
- Chromium/Brave Manifest V3 service worker background
- `chrome.*` API compatibility instead of Firefox-style `browser.*`
- duplicate-capture suppression so the same direct URL is not retriggered repeatedly
- stronger popup diagnostics
- preserved `page-hook.js` interception logic

## Files
- manifest.json
- background.js
- content.js
- page-hook.js
- popup.html
- popup.js

## How to load in Brave
1. Open `brave://extensions`
2. Turn on **Developer mode**
3. Click **Load unpacked**
4. Select this folder

## How to test
1. Open ChatGPT in Brave
2. Trigger the normal file download that is hanging
3. The extension should capture the underlying direct `download_url`
4. It will attempt the real download automatically
5. Click the extension icon to inspect logs or retry the last captured URL

## Notes
- This package is Brave-ready structurally, but the live ChatGPT response path still depends on the current site behavior.
- If Brave shows an extension error, inspect the service worker logs from `brave://extensions`.
