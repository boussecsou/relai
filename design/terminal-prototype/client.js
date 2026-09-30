// PROTOTYPE: example mail bindings; real native CLI input/output.
const $ = id => document.getElementById(id);
const variants = ['A', 'B', 'C'];
const names = ['Terminal central', 'Mail et terminal côte à côte', 'Terminal sous le mail'];
let variant = variants.includes(new URL(location.href).searchParams.get('variant'))
  ? new URL(location.href).searchParams.get('variant') : 'A';
let selected = null, socket = null, terminal = null, fit = null;
let hasControl = false, generation = 0, retry = null, noticeTimer = null;
let command = 'codex';
const activities = new Map();
function notice(text) {
  $('notice').textContent = text; $('notice').hidden = false;
  clearTimeout(noticeTimer); noticeTimer = setTimeout(() => $('notice').hidden = true, 4500);
}
function activity(text) {
  if (!selected) return;
  const entries = activities.get(selected) || [];
  entries.unshift({ text, time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) });
  activities.set(selected, entries.slice(0, 8));
  $('activity').replaceChildren(...entries.slice(0, 8).map(entry => {
    const item = document.createElement('li'), time = document.createElement('time');
    time.textContent = entry.time; item.append(time, document.createTextNode(entry.text)); return item;
  }));
}
function send(data) { if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(data)); }
function resize() {
  if (!fit || $('workspace').hidden) return;
  if (hasControl) {
    fit.fit(); send({ type: 'resize', cols: terminal.cols, rows: terminal.rows });
  }
}
function switchVariant(next) {
  variant = next; document.body.dataset.variant = variant;
  const url = new URL(location.href); url.searchParams.set('variant', variant);
  history.replaceState(null, '', url);
  $('variant-label').textContent = `${variant} · ${names[variants.indexOf(variant)]}`;
  requestAnimationFrame(resize);
}
function disconnect() {
  generation++; clearTimeout(retry); socket?.close(); socket = null;
  terminal?.dispose(); terminal = null; fit = null; hasControl = false;
}
function returnToInbox() {
  disconnect(); selected = null; document.body.classList.remove('focus');
  $('workspace').hidden = true; $('inbox').hidden = false; $('breadcrumb').textContent = 'Inbox';
  $('inbox-button').focus();
}
async function openSession(id) {
  disconnect(); selected = id;
  $('inbox').hidden = true; $('workspace').hidden = false;
  const title = id === 'session-a' ? 'Session principale' : 'Deuxième session';
  $('session-title').textContent = title; $('breadcrumb').textContent = `Inbox / ${title}`;
  $('agent-name').textContent = command === 'bash' ? 'Bash · mode de vérification' : 'Codex';
  $('terminal-name').textContent = command === 'bash' ? 'Bash' : 'Codex CLI';
  $('activity').replaceChildren();
  terminal = new Terminal({ cursorBlink: true, fontSize: innerWidth < 760 ? 11 : 13,
    fontFamily: '"DejaVu Sans Mono", "Liberation Mono", Consolas, monospace',
    lineHeight: 1.25, scrollback: 3000, cols: 100, rows: 30,
    theme: { background: '#15191e', foreground: '#dce3e9', cursor: '#b7dbd2', selectionBackground: '#b7dbd238' } });
  fit = new FitAddon.FitAddon(); terminal.loadAddon(fit); terminal.open($('terminal'));
  terminal.onData(data => {
    if (!hasControl) return;
    const bytes = new TextEncoder().encode(data);
    for (let offset = 0; offset < bytes.length; offset += 32768) {
      send({ type: 'input', data: btoa(String.fromCharCode(...bytes.subarray(offset, offset + 32768))) });
    }
  });
  terminal.onBinary(data => { if (hasControl) send({ type: 'input', data: btoa(data) }); });
  // Leave native keys, including /, Escape, arrows and Ctrl-C, to the CLI.
  terminal.attachCustomKeyEventHandler(event => {
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'f') {
      if (event.type === 'keydown') $('focus').click(); return false;
    }
    return true;
  });
  connect(id, generation);
}
function connect(id, currentGeneration) {
  if (selected !== id || generation !== currentGeneration) return;
  $('connection').textContent = 'Connexion…';
  const ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/terminal?id=${id}`);
  socket = ws;
  ws.onmessage = event => {
    if (generation !== currentGeneration) return;
    const message = JSON.parse(event.data);
    if (message.type === 'snapshot') {
      terminal.reset(); terminal.resize(message.cols, message.rows);
      terminal.write(message.data, () => terminal.focus());
      activity('Terminal retrouvé.');
    }
    if (message.type === 'output') {
      const bytes = Uint8Array.from(atob(message.data), char => char.charCodeAt(0));
      terminal.write(bytes);
    }
    if (message.type === 'state') {
      const previously = hasControl; hasControl = message.control && message.running;
      terminal.options.disableStdin = !hasControl;
      $('connection').textContent = message.running ? 'Terminal connecté' : 'Processus arrêté';
      $('process-state').textContent = message.running ? 'En cours' : 'Arrêté';
      $('client-count').textContent = String(message.connected);
      $('writer-state').textContent = hasControl ? 'Ce panneau' : 'Lecture seule';
      $('control-status').textContent = hasControl ? 'Vous contrôlez cette session' : 'Ce panneau est en lecture seule';
      $('claim').hidden = hasControl || !message.running; $('stop').disabled = !message.running;
      if (hasControl && !previously) requestAnimationFrame(resize);
    }
    if (message.type === 'size') {
      terminal.resize(message.cols, message.rows); $('dimensions').textContent = `${message.cols} × ${message.rows}`;
    }
    if (message.type === 'exit') activity('Le processus du terminal est arrêté.');
  };
  ws.onclose = () => {
    if (generation !== currentGeneration || selected !== id) return;
    hasControl = false; terminal.options.disableStdin = true;
    $('connection').textContent = 'Déconnecté · nouvelle tentative…';
    $('control-status').textContent = 'Connexion interrompue';
    activity('Connexion interrompue ; le processus reste côté serveur.');
    retry = setTimeout(() => connect(id, currentGeneration), 1500);
  };
  ws.onerror = () => { /* onclose handles retry. */ };
}
document.querySelectorAll('[data-session]').forEach(button => button.addEventListener('click', () => openSession(button.dataset.session)));
$('inbox-button').onclick = returnToInbox; $('back').onclick = returnToInbox;
$('focus').onclick = () => {
  const enabled = document.body.classList.toggle('focus');
  $('focus').setAttribute('aria-pressed', enabled); $('focus').textContent = enabled ? '⤡ Quitter le focus' : '⤢ Mode focus';
  requestAnimationFrame(resize);
};
$('context-toggle').onclick = () => {
  const hidden = document.body.classList.toggle('context-hidden');
  $('context-toggle').setAttribute('aria-expanded', !hidden); requestAnimationFrame(resize);
};
$('claim').onclick = () => { send({ type: 'claim' }); activity('Contrôle demandé pour ce panneau.'); terminal.focus(); };
$('reconnect').onclick = () => openSession(selected);
$('stop').onclick = async () => {
  if (!confirm('Arrêter le processus de cette session ? Fermer le panneau suffit pour le laisser travailler.')) return;
  const response = await fetch(`/api/stop?id=${selected}`, { method: 'POST' });
  if (!response.ok) notice('L’arrêt n’a pas été confirmé.');
};
$('previous-variant').onclick = () => switchVariant(variants[(variants.indexOf(variant) + 2) % 3]);
$('next-variant').onclick = () => switchVariant(variants[(variants.indexOf(variant) + 1) % 3]);
new ResizeObserver(() => requestAnimationFrame(resize)).observe($('terminal'));
switchVariant(variant);
fetch('/api/state').then(response => response.json()).then(state => {
  command = state.command;
  document.querySelectorAll('.avatar').forEach(avatar => avatar.textContent = command === 'bash' ? 'B' : 'C');
}).catch(() => notice('Démarrer le serveur du prototype pour ouvrir les terminaux.'));
