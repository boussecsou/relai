// Read-only ownership check: background/ephemeral work is not a user conversation.
// No thread/start, thread/resume, turn/start or interaction with the native CLI.
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';

export function nativeThreadReader() {
  let child, ready, next = 0;
  const pending = new Map();
  function request(method, params) {
    const id = ++next;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { pending.delete(id); reject(new Error('Lecture native indisponible.')); }, 8000);
      pending.set(id, { resolve, reject, timer });
      child.stdin.write(JSON.stringify({ id, method, params }) + '\n');
    });
  }
  function fail() {
    for (const value of pending.values()) { clearTimeout(value.timer); value.reject(new Error('Lecture native interrompue.')); }
    pending.clear(); ready = null;
  }
  function initialize() {
    child = spawn('codex', ['app-server'], { stdio: ['pipe', 'pipe', 'pipe'] });
    child.stderr.on('data', () => {});
    child.stdin.on('error', fail); child.on('error', fail); child.on('exit', fail);
    createInterface({ input: child.stdout }).on('line', line => {
      let message; try { message = JSON.parse(line); } catch { return; }
      const value = pending.get(message.id);
      if (!value) return;
      pending.delete(message.id); clearTimeout(value.timer);
      if (message.error) {
        const error = new Error(message.error.message || 'Lecture native indisponible.');
        error.nativeCode = message.error.code; value.reject(error);
      } else value.resolve(message.result);
    });
    return request('initialize', { clientInfo: { name: 'relai_inbox_reader', title: 'Relai inbox reader', version: '0.1.0' } })
      .then(() => child.stdin.write(JSON.stringify({ method: 'initialized', params: {} }) + '\n'));
  }
  return {
    async isUserThread(threadId) {
      if (typeof threadId !== 'string' || !/^[\da-f-]{36}$/i.test(threadId)) return false;
      if (!ready) ready = initialize().catch(error => { ready = null; child?.stdin.end(); throw error; });
      await ready;
      try {
        const result = await request('thread/read', { threadId, includeTurns: false });
        // Temporary system threads are ephemeral; subagent threads are not this CLI's recipient.
        return result.thread?.source === 'cli';
      } catch (error) {
        if (/not found|not loaded|no rollout|does not exist/i.test(error.message)) return false;
        throw error;
      }
    },
    close() { child?.stdin.end(); },
  };
}
