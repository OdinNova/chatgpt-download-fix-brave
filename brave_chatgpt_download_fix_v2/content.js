(() => {
  const api = chrome;

  function sendMessage(message) {
    try {
      api.runtime.sendMessage(message, () => void api.runtime.lastError);
    } catch {}
  }

  function injectPageHook() {
    const script = document.createElement('script');
    script.src = api.runtime.getURL('page-hook.js');
    script.dataset.chatgptDownloadRescue = 'v3';
    (document.documentElement || document.head || document.body).appendChild(script);
    script.addEventListener('load', () => script.remove(), { once: true });
  }

  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    const data = event.data;
    if (!data || data.__chatgptDownloadRescue !== 'v3') return;

    if (data.type === 'DIRECT_URL_CAPTURE') {
      sendMessage({
        type: 'DIRECT_URL_CAPTURE',
        source: data.source || 'page-hook',
        requestUrl: data.requestUrl || '',
        directUrl: data.directUrl || '',
        filename: data.filename || '',
      });
      return;
    }

    if (data.type === 'HOOK_LOG') {
      sendMessage({
        type: 'HOOK_LOG',
        level: data.level || 'debug',
        event: data.event || 'HOOK_LOG',
        data: data.data || {},
      });
    }
  }, true);

  injectPageHook();
})();
