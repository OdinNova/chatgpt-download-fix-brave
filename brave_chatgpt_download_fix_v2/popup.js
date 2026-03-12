const api = chrome;
const summaryNode = document.getElementById('summary');
const captureNode = document.getElementById('capture');
const logsNode = document.getElementById('logs');
const redownloadButton = document.getElementById('redownload');
const openButton = document.getElementById('open');
const clearButton = document.getElementById('clear');
const refreshButton = document.getElementById('refresh');

function sendMessage(message) {
  return new Promise((resolve, reject) => {
    api.runtime.sendMessage(message, (response) => {
      const err = api.runtime.lastError;
      if (err) reject(new Error(err.message || String(err)));
      else resolve(response);
    });
  });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderCapture(capture) {
  if (!capture) return 'No captured direct URL yet.';
  return JSON.stringify(capture, null, 2);
}

async function refresh() {
  const state = await sendMessage({ type: 'GET_STATE' });
  const logs = (state.logs || []).slice().reverse();

  summaryNode.textContent = [
    `${logs.length} log entries`,
    `captures: ${state.captureCount || 0}`,
    state.lastCapture?.filename ? `last file: ${state.lastCapture.filename}` : 'last file: none',
  ].join(' · ');

  captureNode.textContent = renderCapture(state.lastCapture);

  logsNode.innerHTML = logs.map((log) => `
    <div class="log">
      <div><strong>${escapeHtml(log.event)}</strong></div>
      <div class="muted">${escapeHtml(log.ts)} · ${escapeHtml(log.level)}</div>
      <div class="mono">${escapeHtml(JSON.stringify(log.data, null, 2))}</div>
    </div>
  `).join('');
}

redownloadButton.addEventListener('click', async () => {
  await sendMessage({ type: 'REDOWNLOAD_LAST' });
  await refresh();
});

openButton.addEventListener('click', async () => {
  await sendMessage({ type: 'OPEN_LAST' });
  await refresh();
});

clearButton.addEventListener('click', async () => {
  await sendMessage({ type: 'CLEAR_LOGS' });
  await refresh();
});

refreshButton.addEventListener('click', async () => {
  await refresh();
});

void refresh();
