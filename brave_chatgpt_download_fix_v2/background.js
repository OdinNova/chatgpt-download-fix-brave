const api = chrome;
const STATE_KEY = 'state';
const MAX_LOGS = 300;

function nowIso() {
  return new Date().toISOString();
}

function callChrome(fn, ...args) {
  return new Promise((resolve, reject) => {
    fn(...args, (result) => {
      const err = api.runtime.lastError;
      if (err) {
        reject(new Error(err.message || String(err)));
        return;
      }
      resolve(result);
    });
  });
}

function storageGet(key) {
  return callChrome(api.storage.local.get.bind(api.storage.local), key);
}

function storageSet(value) {
  return callChrome(api.storage.local.set.bind(api.storage.local), value);
}

function createTab(value) {
  return callChrome(api.tabs.create.bind(api.tabs), value);
}

function startDownload(value) {
  return callChrome(api.downloads.download.bind(api.downloads), value);
}

async function loadState() {
  const stored = await storageGet(STATE_KEY);
  return stored[STATE_KEY] || {
    logs: [],
    lastCapture: null,
    lastCaptureKey: '',
    captureCount: 0,
    downloadIds: {},
  };
}

async function saveState(state) {
  await storageSet({ [STATE_KEY]: state });
}

async function mutateState(mutator) {
  const state = await loadState();
  await mutator(state);
  await saveState(state);
  return state;
}

async function addLog(level, event, data = {}) {
  await mutateState((state) => {
    state.logs.push({
      ts: nowIso(),
      level,
      event,
      data,
    });
    state.logs = state.logs.slice(-MAX_LOGS);
  });
}

function safeFilename(name) {
  return (
    String(name || 'chatgpt-download')
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 180) || 'chatgpt-download'
  );
}

function filenameFromRequestUrl(requestUrl) {
  try {
    const parsed = new URL(requestUrl);
    const sandboxPath = parsed.searchParams.get('sandbox_path') || '';
    const piece = sandboxPath.split('/').filter(Boolean).pop();
    return piece ? safeFilename(decodeURIComponent(piece)) : '';
  } catch {
    return '';
  }
}

function filenameFromDirectUrl(directUrl) {
  try {
    const parsed = new URL(directUrl);
    const piece = parsed.pathname.split('/').filter(Boolean).pop();
    return piece ? safeFilename(decodeURIComponent(piece)) : '';
  } catch {
    return '';
  }
}

function normalizeCapture(capture) {
  const requestUrl = String(capture.requestUrl || '');
  const directUrl = String(capture.directUrl || '');
  const filename = safeFilename(
    capture.filename ||
      filenameFromRequestUrl(requestUrl) ||
      filenameFromDirectUrl(directUrl) ||
      'chatgpt-download'
  );

  return { requestUrl, directUrl, filename };
}

function captureKey(capture) {
  return [capture.requestUrl, capture.directUrl, capture.filename].join('||');
}

async function startDirectDownload(capture, source) {
  const normalized = normalizeCapture(capture);

  await addLog('debug', 'DIRECT_URL_READY', {
    source,
    requestUrl: normalized.requestUrl,
    directUrl: normalized.directUrl,
    filename: normalized.filename,
  });

  try {
    const downloadId = await startDownload({
      url: normalized.directUrl,
      filename: normalized.filename,
      saveAs: false,
      conflictAction: 'uniquify',
    });

    await mutateState((state) => {
      state.downloadIds[String(downloadId)] = {
        ...normalized,
        source,
        startedAt: nowIso(),
      };
    });

    await addLog('debug', 'DOWNLOAD_STARTED', {
      source,
      downloadId,
      filename: normalized.filename,
      directUrl: normalized.directUrl,
    });

    return { ok: true, downloadId, filename: normalized.filename };
  } catch (error) {
    await addLog('error', 'DOWNLOAD_FAILED', {
      source,
      error: String(error),
      filename: normalized.filename,
      directUrl: normalized.directUrl,
    });
    return { ok: false, error: String(error) };
  }
}

async function handleCapture(capture, source) {
  if (!capture || !capture.directUrl) {
    await addLog('warn', 'CAPTURE_REJECTED_NO_DIRECT_URL', { source });
    return { ok: false, error: 'No directUrl present.' };
  }

  const normalized = normalizeCapture(capture);
  const key = captureKey(normalized);
  const state = await loadState();

  if (state.lastCaptureKey && state.lastCaptureKey === key) {
    await addLog('debug', 'CAPTURE_DUPLICATE_IGNORED', {
      source,
      filename: normalized.filename,
      directUrl: normalized.directUrl,
    });
    return { ok: true, duplicate: true, filename: normalized.filename };
  }

  await mutateState((nextState) => {
    nextState.lastCapture = normalized;
    nextState.lastCaptureKey = key;
    nextState.captureCount = Number(nextState.captureCount || 0) + 1;
  });

  return startDirectDownload(normalized, source);
}

api.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    if (!message || typeof message !== 'object') {
      sendResponse(undefined);
      return;
    }

    if (message.type === 'DIRECT_URL_CAPTURE') {
      sendResponse(
        await handleCapture(
          {
            requestUrl: message.requestUrl || '',
            directUrl: message.directUrl || '',
            filename: message.filename || '',
          },
          message.source || 'page-hook'
        )
      );
      return;
    }

    if (message.type === 'HOOK_LOG') {
      await addLog(message.level || 'debug', message.event || 'HOOK_LOG', message.data || {});
      sendResponse({ ok: true });
      return;
    }

    if (message.type === 'GET_STATE') {
      sendResponse(await loadState());
      return;
    }

    if (message.type === 'REDOWNLOAD_LAST') {
      const state = await loadState();
      if (!state.lastCapture) {
        sendResponse({ ok: false, error: 'No captured direct URL yet.' });
        return;
      }
      sendResponse(await startDirectDownload(state.lastCapture, 'popup-redownload'));
      return;
    }

    if (message.type === 'OPEN_LAST') {
      const state = await loadState();
      if (!state.lastCapture?.directUrl) {
        sendResponse({ ok: false, error: 'No captured direct URL yet.' });
        return;
      }

      const tab = await createTab({
        url: state.lastCapture.directUrl,
        active: true,
      });

      await addLog('debug', 'OPENED_DIRECT_URL_TAB', {
        tabId: tab.id,
        directUrl: state.lastCapture.directUrl,
      });

      sendResponse({ ok: true, tabId: tab.id });
      return;
    }

    if (message.type === 'CLEAR_LOGS') {
      await mutateState((state) => {
        state.logs = [];
      });
      sendResponse({ ok: true });
      return;
    }

    sendResponse(undefined);
  })().catch(async (error) => {
    try {
      await addLog('error', 'MESSAGE_HANDLER_THROW', {
        error: String(error),
        messageType: message?.type || '',
      });
    } catch {}
    sendResponse({ ok: false, error: String(error) });
  });

  return true;
});

api.downloads.onChanged.addListener((delta) => {
  void (async () => {
    const id = String(delta.id);
    const state = await loadState();
    const meta = state.downloadIds[id];
    if (!meta) return;

    const payload = {
      downloadId: delta.id,
      filename: meta.filename,
      directUrl: meta.directUrl,
    };

    if (delta.state) payload.state = delta.state.current;
    if (delta.error) payload.error = delta.error.current;
    if (delta.filename) payload.finalFilename = delta.filename.current;

    await addLog('debug', 'DOWNLOAD_CHANGED', payload);
  })();
});
