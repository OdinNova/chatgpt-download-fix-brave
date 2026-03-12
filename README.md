# chatgpt-download-fix-brave
# ChatGPT Download Fix for Brave

This is a temporary Brave browser workaround for the current ChatGPT file download issue where downloads get stuck on **"Starting download"** and never begin.

## What this fixes

This extension attempts to capture the real direct download URL used by ChatGPT and start the actual file download in Brave.

It is meant to help while ChatGPT file downloads are failing on the normal web flow.

## Important

- This is a **temporary workaround**
- This is **not an official OpenAI fix**
- This is for **Brave / Chromium-based browsers**
- This must be loaded as an **unpacked extension**
- Use at your own discretion

## How to install in Brave

1. Download or clone this repository
2. Extract the files if needed
3. Open Brave
4. Go to `brave://extensions`
5. Turn on **Developer mode**
6. Click **Load unpacked**
7. Select the extracted extension folder
8. Open ChatGPT and try the broken download again

## How to use

1. Open ChatGPT in Brave
2. Trigger the download that normally hangs
3. The extension will try to capture the underlying direct download URL
4. It will then attempt to start the real download automatically
5. You can also open the extension popup to inspect logs or retry the last captured URL

## Notes

- This was created as a workaround for the current ChatGPT download issue
- It may stop working if ChatGPT changes its internal download flow
- If Brave shows an extension error, check the extension service worker logs in `brave://extensions`

## Files

- `manifest.json`
- `background.js`
- `content.js`
- `page-hook.js`
- `popup.html`
- `popup.js`

## Disclaimer

This project is not affiliated with or endorsed by OpenAI.

This is an unofficial community workaround intended to help users affected by the current ChatGPT download issue.
