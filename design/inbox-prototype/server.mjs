// PROTOTYPE: reading a Relai never creates a terminal. Only POST /api/sessions does.
import http from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { randomBytes, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createRequire } from 'node:module';
import { WebSocketServer, WebSocket } from 'ws';
import { threads, newThread, publicThread, receiveReply, matchesQuery } from './mail-store.mjs';
import { nativeThreadReader } from './native-thread-reader.mjs';

const require = createRequire(import.meta.url);
const { Terminal } = require('@xterm/headless');
const { SerializeAddon } = require('@xterm/addon-serialize');
const exec = promisify(execFile);
const root = path.dirname(fileURLToPath(import.meta.url));
const project = path.resolve(root, '../..');
const port = Number(process.env.RELAI_INBOX_PORT || 4176);
const mode = process.env.RELAI_INBOX_COMMAND || 'codex';
if (!['codex', 'bash'].includes(mode)) throw new Error('Choisir codex ou bash.');
const agents = [];
try { await exec(mode, ['--version'], { timeout: 3000 }); agents.push(mode); } catch {}
const cookie = `relai_inbox_${port}=${randomBytes(32).toString('hex')}`;
const receiverToken = randomBytes(32).toString('hex');
const origins = new Set([`http://127.0.0.1:${port}`, `http://localhost:${port}`]);
const hosts = new Set([`127.0.0.1:${port}`, `localhost:${port}`]);
const runtimes = new Map(), listeners = new Set();
const nativeReader = nativeThreadReader();
const files = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/client.js': ['client.js', 'text/javascript; charset=utf-8'],
  '/style.css': ['style.css', 'text/css; charset=utf-8'],
  '/Manrope.woff2': ['Manrope.woff2', 'font/woff2'],
  '/font-license': ['../fonts/Manrope-OFL.txt', 'text/plain; charset=utf-8'],
  '/xterm.js': ['node_modules/@xterm/xterm/lib/xterm.js', 'text/javascript'],
  '/xterm.css': ['node_modules/@xterm/xterm/css/xterm.css', 'text/css'],
  '/fit.js': ['node_modules/@xterm/addon-fit/lib/addon-fit.js', 'text/javascript'],
  '/marked.js': ['node_modules/marked/lib/marked.umd.js', 'text/javascript'],
  '/purify.js': ['node_modules/dompurify/dist/purify.min.js', 'text/javascript'],
};
const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
  'Content-Security-Policy': "default-src 'self'; connect-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'" };
function allowed(req) {
  return hosts.has(req.headers.host) && (!req.headers.origin || origins.has(req.headers.origin))
    && !['cross-site', 'same-site'].includes(req.headers['sec-fetch-site']);
}
function authenticated(req) { return (req.headers.cookie || '').split(';').map(s => s.trim()).includes(cookie); }
function json(res, status, data) { res.writeHead(status, { ...headers, 'Content-Type': 'application/json' }); res.end(JSON.stringify(data)); }
async function body(req) {
  let size = 0; const chunks = [];
  for await (const chunk of req) {
    size += chunk.length; if (size > 1024 * 1024) throw new Error('Message trop volumineux.'); chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString());
}
function changed(threadId, reason = 'metadata') {
  for (const res of listeners) {
    if (res.writableLength > 256 * 1024) { res.end(); listeners.delete(res); continue; }
    res.write(`data: ${JSON.stringify({ threadId, reason })}\n\n`);
  }
}
async function branch(cwd) {
  try { return (await exec('git', ['branch', '--show-current'], { cwd, timeout: 1500 })).stdout.trim(); }
  catch { return ''; }
}
function send(ws, data) { if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data)); }
function runtimeState(runtime) {
  return { running: !runtime.exited, cols: runtime.term.cols, rows: runtime.term.rows,
    connected: runtime.clients.size, started: runtime.started, threadId: runtime.currentThreadId };
}
function broadcastState(runtime) {
  for (const ws of runtime.clients) send(ws, { type: 'state', ...runtimeState(runtime), control: ws === runtime.controller });
}
function write(runtime, message) {
  if (!runtime.exited && runtime.child.stdin.writable) runtime.child.stdin.write(JSON.stringify(message) + '\n');
}
function createRuntime(thread, prompt, agent) {
  const id = randomUUID();
  const term = new Terminal({ cols: 100, rows: 30, scrollback: 3000, allowProposedApi: true });
  const serializer = new SerializeAddon(); term.loadAddon(serializer);
  const notifyConfig = `notify=${JSON.stringify(['python3', path.join(root, 'notify.py')])}`;
  const argv = agent === 'bash' ? ['bash', '--noprofile', '--norc', '-i']
    : ['codex', '-c', notifyConfig, ...(prompt ? [prompt] : [])];
  const child = spawn('python3', ['-u', path.join(root, 'pty_bridge.py'), ...argv], {
    cwd: thread.cwd, stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, PS1: 'relai-prototype $ ', RELAI_INBOX_URL: `http://127.0.0.1:${port}`,
      RELAI_INBOX_TOKEN: receiverToken, RELAI_RUNTIME_ID: id },
  });
  const runtime = { id, term, serializer, child, clients: new Set(), controller: null,
    exited: false, started: Date.now(), currentThreadId: thread.id };
  term.onData(data => { if (!runtime.controller) write(runtime, { type: 'input', data: Buffer.from(data).toString('base64') }); });
  child.stdout.on('data', chunk => {
    child.stdout.pause();
    term.write(chunk, () => {
      for (const ws of runtime.clients) {
        if (ws.bufferedAmount > 2 * 1024 * 1024) { ws.close(1013, 'Reconnexion requise'); continue; }
        send(ws, { type: 'output', data: chunk.toString('base64') });
      }
      child.stdout.resume();
    });
  });
  child.stderr.on('data', () => {});
  const exit = code => {
    runtime.exited = true;
    for (const ws of runtime.clients) send(ws, { type: 'exit', code });
    broadcastState(runtime); changed(runtime.currentThreadId, 'process');
  };
  child.on('exit', exit); child.on('error', () => exit(127));
  runtimes.set(id, runtime); thread.runtimeId = id; return runtime;
}
const server = http.createServer(async (req, res) => {
  if (!allowed(req)) { json(res, 403, { error: 'Accès refusé.' }); return; }
  const url = new URL(req.url, `http://127.0.0.1:${port}`);
  try {
    // Native notifications use their own credential; never exposed to the browser.
    if (url.pathname === '/api/receive' && req.method === 'POST') {
      if (req.headers.authorization !== `Bearer ${receiverToken}`) { json(res, 403, { error: 'Accès refusé.' }); return; }
      const data = await body(req), runtime = runtimes.get(data.runtimeId);
      if (!runtime) { json(res, 404, { error: 'Terminal inconnu.' }); return; }
      if (mode === 'codex' && !(await nativeReader.isUserThread(data.notification?.['thread-id']))) {
        json(res, 200, { ignored: true }); return;
      }
      const previous = runtime.currentThreadId;
      const { thread, duplicate } = receiveReply(runtime, data.notification);
      if (!duplicate) {
        thread.branch = await branch(thread.cwd);
        changed(thread.id, 'message');
        if (previous !== thread.id) changed(previous, 'process');
        broadcastState(runtime);
      }
      json(res, 200, { id: thread.id, duplicate }); return;
    }
    if (url.pathname.startsWith('/api/') || url.pathname === '/events') {
      if (!authenticated(req)) { json(res, 401, { error: 'Ouvrir Relai pour se connecter.' }); return; }
      if (!['GET', 'HEAD'].includes(req.method) && !origins.has(req.headers.origin)) { json(res, 403, { error: 'Origine refusée.' }); return; }
    }
    if (url.pathname === '/events' && req.method === 'GET') {
      res.writeHead(200, { ...headers, 'Content-Type': 'text/event-stream', Connection: 'keep-alive' });
      res.write('data: {"reason":"connected"}\n\n'); listeners.add(res);
      const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), 20000);
      res.on('close', () => { clearInterval(heartbeat); listeners.delete(res); }); return;
    }
    if (url.pathname === '/api/inbox' && req.method === 'GET') {
      const all = [...threads.values()];
      const list = all.filter(thread => matchesQuery(thread, (url.searchParams.get('q') || '').slice(0, 500))).sort((a, b) => b.updated - a.updated).slice(0, 200);
      json(res, 200, { threads: list.map(thread => publicThread(thread, runtimes)), agents,
        labels: [...new Set(all.flatMap(thread => thread.labels))],
        unreadCount: all.filter(thread => thread.unread && !thread.archived).length,
        localUnreadCount: all.filter(thread => thread.unread && !thread.archived && thread.source !== 'example').length,
        defaultCwd: project, activeTerminals: [...runtimes.values()].filter(r => !r.exited).length }); return;
    }
    if (url.pathname === '/api/thread') {
      const thread = threads.get(url.searchParams.get('id'));
      if (!thread) { json(res, 404, { error: 'Conversation introuvable.' }); return; }
      if (req.method === 'PATCH') {
        const patch = await body(req);
        for (const key of ['unread', 'starred', 'archived']) if (typeof patch[key] === 'boolean') thread[key] = patch[key];
        if (Array.isArray(patch.labels)) thread.labels = [...new Set(patch.labels.filter(label => typeof label === 'string' && label.length <= 40))].slice(0, 12);
        if (typeof patch.ticket === 'string') thread.ticket = patch.ticket.slice(0, 80);
        changed(thread.id);
      } else if (req.method !== 'GET') { json(res, 405, { error: 'Méthode indisponible.' }); return; }
      json(res, 200, publicThread(thread, runtimes, true)); return;
    }
    if (url.pathname === '/api/sessions' && req.method === 'POST') {
      const data = await body(req);
      if (!agents.includes(data.agent)) throw new Error('Cet agent n’est pas disponible dans ce prototype.');
      if (typeof data.title !== 'string' || !data.title.trim() || data.title.length > 160) throw new Error('Choisir un nom de chat (160 caractères maximum).');
      if (typeof data.cwd !== 'string' || !data.cwd.trim()) throw new Error('Choisir un dossier.');
      let cwd;
      try { cwd = await realpath(data.cwd); if (!(await stat(cwd)).isDirectory()) throw new Error(); }
      catch { throw new Error('Ce dossier n’est pas accessible. Choisir un dossier existant.'); }
      const gitBranch = await branch(cwd);
      if ([...runtimes.values()].filter(r => !r.exited).length >= 12) throw new Error('Limite du prototype atteinte : 12 terminaux actifs.');
      const prompt = typeof data.prompt === 'string' ? data.prompt.trim() : '';
      if (data.agent === 'bash' && prompt) throw new Error('Le mode Bash de vérification se lance sans prompt.');
      const labels = typeof data.label === 'string' && data.label.trim() ? [data.label.trim().slice(0, 40)] : [];
      const thread = newThread({ title: data.title.trim(), agent: data.agent === 'bash' ? 'Bash' : 'Codex', cwd,
        branch: gitBranch, labels, prompt, source: data.agent === 'bash' ? 'test' : 'local' });
      thread.ticket = typeof data.ticket === 'string' ? data.ticket.slice(0, 80) : '';
      createRuntime(thread, prompt, data.agent); changed(thread.id, 'session');
      json(res, 201, publicThread(thread, runtimes, true)); return;
    }
    if (url.pathname === '/api/stop' && req.method === 'POST') {
      const thread = threads.get(url.searchParams.get('id'));
      const runtime = runtimes.get(thread?.runtimeId);
      if (!runtime || runtime.currentThreadId !== thread.id) { json(res, 409, { error: 'Aucun terminal actif lié à ce chat.' }); return; }
      runtime.child.stdin.end(); json(res, 200, { stopped: true }); return;
    }
    const file = files[url.pathname];
    if (req.method !== 'GET' || !file) { json(res, 404, { error: 'Page introuvable.' }); return; }
    const content = await readFile(path.join(root, file[0]));
    res.writeHead(200, { ...headers, 'Content-Type': file[1],
      ...(url.pathname === '/' ? { 'Set-Cookie': `${cookie}; HttpOnly; SameSite=Strict; Path=/` } : {}) });
    res.end(content);
  } catch (error) { json(res, 400, { error: error.code === 'ENOENT' ? 'Installer les dépendances du prototype avec npm ci.' : error.message }); }
});
const wss = new WebSocketServer({ noServer: true, maxPayload: 256 * 1024 });
server.on('upgrade', (req, socket, head) => {
  const url = new URL(req.url, `http://127.0.0.1:${port}`);
  const thread = threads.get(url.searchParams.get('id'));
  const runtime = runtimes.get(thread?.runtimeId);
  if (!allowed(req) || !authenticated(req) || !origins.has(req.headers.origin) || url.pathname !== '/terminal') {
    socket.end('HTTP/1.1 403 Forbidden\r\n\r\n'); return;
  }
  // Attaching never creates a CLI. An unrelated or stopped terminal is not a destination.
  if (!runtime || runtime.exited || runtime.currentThreadId !== thread.id) {
    socket.end('HTTP/1.1 409 Conflict\r\n\r\n'); return;
  }
  wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws, runtime));
});
wss.on('connection', (ws, runtime) => {
  runtime.term.write('', () => {
    if (ws.readyState !== WebSocket.OPEN) return;
    send(ws, { type: 'snapshot', cols: runtime.term.cols, rows: runtime.term.rows, data: runtime.serializer.serialize() });
    runtime.clients.add(ws); if (!runtime.controller) runtime.controller = ws; broadcastState(runtime);
  });
  ws.on('message', raw => {
    let message; try { message = JSON.parse(raw.toString()); } catch { return; }
    if (message.type === 'claim') { runtime.controller = ws; broadcastState(runtime); return; }
    if (runtime.controller !== ws || runtime.exited) return;
    if (message.type === 'input' && typeof message.data === 'string') write(runtime, message);
    if (message.type === 'resize' && Number.isInteger(message.cols) && Number.isInteger(message.rows)
        && message.cols >= 10 && message.cols <= 400 && message.rows >= 3 && message.rows <= 150) {
      runtime.term.resize(message.cols, message.rows); write(runtime, message);
      for (const client of runtime.clients) send(client, { type: 'size', cols: message.cols, rows: message.rows });
    }
  });
  ws.on('close', () => { runtime.clients.delete(ws); if (runtime.controller === ws) runtime.controller = null; broadcastState(runtime); });
  ws.on('error', () => {});
});
function shutdown() {
  nativeReader.close();
  for (const runtime of runtimes.values()) runtime.child.stdin.end();
  for (const listener of listeners) listener.end();
  server.close(); wss.close(); setTimeout(() => process.exit(0), 1500).unref();
}
process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown);
server.listen(port, '127.0.0.1', () => console.log(`Relai Inbox : http://127.0.0.1:${port}`));
server.on('error', error => { console.error(error.code === 'EADDRINUSE' ? 'Port occupé : choisir RELAI_INBOX_PORT.' : error.message); shutdown(); });
