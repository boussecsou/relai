// PROTOTYPE only. In-memory sessions; a native Rust supervisor will replace this bridge.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createRequire } from 'node:module';
import { WebSocketServer, WebSocket } from 'ws';

const require = createRequire(import.meta.url);
const { Terminal } = require('@xterm/headless');
const { SerializeAddon } = require('@xterm/addon-serialize');
const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.RELAI_PROTOTYPE_PORT || 4174);
const command = process.env.RELAI_PROTOTYPE_COMMAND || 'codex';
if (!['codex', 'bash'].includes(command)) throw new Error('Choisir codex ou bash.');
const cookie = `relai_terminal_${port}=${randomBytes(32).toString('hex')}`;
const origins = new Set([`http://127.0.0.1:${port}`, `http://localhost:${port}`]);
const hosts = new Set([`127.0.0.1:${port}`, `localhost:${port}`]);
const sessions = new Map();
const files = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/client.js': ['client.js', 'text/javascript; charset=utf-8'],
  '/style.css': ['style.css', 'text/css; charset=utf-8'],
  '/xterm.js': ['node_modules/@xterm/xterm/lib/xterm.js', 'text/javascript'],
  '/xterm.css': ['node_modules/@xterm/xterm/css/xterm.css', 'text/css'],
  '/fit.js': ['node_modules/@xterm/addon-fit/lib/addon-fit.js', 'text/javascript'],
};
function allowed(req) {
  return hosts.has(req.headers.host) && (!req.headers.origin || origins.has(req.headers.origin))
    && !['cross-site', 'same-site'].includes(req.headers['sec-fetch-site']);
}
function authenticated(req) {
  return (req.headers.cookie || '').split(';').map(s => s.trim()).includes(cookie);
}
function send(ws, data) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data));
}
function summary(id, session) {
  return { id, command, running: !session.exited, cols: session.term.cols,
    rows: session.term.rows, connected: session.clients.size,
    controller: Boolean(session.controller), started: session.started };
}
function broadcastState(id, session) {
  for (const ws of session.clients) send(ws, { type: 'state', ...summary(id, session), control: ws === session.controller });
}
function createSession(id) {
  const term = new Terminal({ cols: 100, rows: 30, scrollback: 3000, allowProposedApi: true });
  const serializer = new SerializeAddon();
  term.loadAddon(serializer);
  const child = spawn('python3', ['-u', path.join(root, 'pty_bridge.py'), command,
    ...(command === 'bash' ? ['--noprofile', '--norc', '-i'] : [])], {
    cwd: path.resolve(root, '../..'), stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, PS1: 'relai-prototype $ ' },
  });
  const session = { term, serializer, child, clients: new Set(), controller: null,
    exited: false, started: Date.now() };
  // The controller answers terminal queries; when detached, the headless terminal does.
  term.onData(data => {
    if (!session.controller) write(session, { type: 'input', data: Buffer.from(data).toString('base64') });
  });
  child.stdout.on('data', chunk => {
    child.stdout.pause();
    term.write(chunk, () => {
      for (const ws of session.clients) {
        if (ws.bufferedAmount > 2 * 1024 * 1024) { ws.close(1013, 'Reconnexion requise'); continue; }
        send(ws, { type: 'output', data: chunk.toString('base64') });
      }
      child.stdout.resume();
    });
  });
  child.stderr.on('data', () => { /* Diagnostics stay out of the public inbox. */ });
  const exited = code => {
    session.exited = true;
    for (const ws of session.clients) send(ws, { type: 'exit', code });
    broadcastState(id, session);
  };
  child.on('exit', exited);
  child.on('error', () => exited(127));
  sessions.set(id, session);
  return session;
}
function write(session, message) {
  if (!session.exited && session.child.stdin.writable)
    session.child.stdin.write(JSON.stringify(message) + '\n');
}
const server = http.createServer(async (req, res) => {
  if (!allowed(req)) { res.writeHead(403).end('Accès refusé'); return; }
  const url = new URL(req.url, `http://127.0.0.1:${port}`);
  const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'self'; connect-src 'self'; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'" };
  if (url.pathname === '/api/state' && req.method === 'GET' && authenticated(req)) {
    res.writeHead(200, { ...headers, 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ command, sessions: [...sessions].map(([id, s]) => summary(id, s)) })); return;
  }
  if (url.pathname === '/api/stop' && req.method === 'POST' && authenticated(req)
      && origins.has(req.headers.origin)) {
    sessions.get(url.searchParams.get('id'))?.child.stdin.end();
    res.writeHead(204, headers).end(); return;
  }
  const file = files[url.pathname];
  if (req.method !== 'GET' || !file) { res.writeHead(404).end(); return; }
  try {
    const body = await readFile(path.join(root, file[0]));
    res.writeHead(200, { ...headers, 'Content-Type': file[1],
      ...(url.pathname === '/' ? { 'Set-Cookie': `${cookie}; HttpOnly; SameSite=Strict; Path=/` } : {}) });
    res.end(body);
  } catch { res.writeHead(404).end('Exécuter npm install dans le dossier du prototype.'); }
});
const wss = new WebSocketServer({ noServer: true, maxPayload: 256 * 1024 });
server.on('upgrade', (req, socket, head) => {
  const url = new URL(req.url, `http://127.0.0.1:${port}`);
  if (!allowed(req) || !authenticated(req) || !origins.has(req.headers.origin)
      || url.pathname !== '/terminal' || !['session-a', 'session-b'].includes(url.searchParams.get('id'))) {
    socket.end('HTTP/1.1 403 Forbidden\r\n\r\n'); return;
  }
  wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws, url.searchParams.get('id')));
});
wss.on('connection', (ws, id) => {
  const session = sessions.get(id) || createSession(id);
  // Serialize after queued output to make snapshot + live output one ordered stream.
  session.term.write('', () => {
    if (ws.readyState !== WebSocket.OPEN) return;
    send(ws, { type: 'snapshot', cols: session.term.cols, rows: session.term.rows,
      data: session.serializer.serialize() });
    session.clients.add(ws);
    if (!session.controller) session.controller = ws;
    broadcastState(id, session);
  });
  ws.on('message', raw => {
    let message;
    try { message = JSON.parse(raw.toString()); } catch { return; }
    if (message.type === 'claim') { session.controller = ws; broadcastState(id, session); return; }
    if (session.controller !== ws || session.exited) return;
    if (message.type === 'input' && typeof message.data === 'string') write(session, message);
    if (message.type === 'resize' && Number.isInteger(message.cols) && Number.isInteger(message.rows)
        && message.cols >= 10 && message.cols <= 400 && message.rows >= 3 && message.rows <= 150) {
      session.term.resize(message.cols, message.rows); write(session, message);
      for (const client of session.clients) send(client, { type: 'size', cols: message.cols, rows: message.rows });
    }
  });
  ws.on('close', () => {
    session.clients.delete(ws);
    if (session.controller === ws) session.controller = null;
    broadcastState(id, session);
  });
  ws.on('error', () => {});
});
function shutdown() {
  for (const session of sessions.values()) session.child.stdin.end();
  server.close(); wss.close();
  setTimeout(() => process.exit(0), 1500).unref();
}
process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown);
server.listen(port, '127.0.0.1', () => console.log(`Prototype Relai : http://127.0.0.1:${port} (${command})`));
server.on('error', error => { console.error(error.code === 'EADDRINUSE' ? 'Port occupé : choisir RELAI_PROTOTYPE_PORT.' : error.message); shutdown(); });
