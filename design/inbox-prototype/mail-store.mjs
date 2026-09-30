// PROTOTYPE: messages and metadata in memory, independent of terminal creation.
import { randomUUID } from 'node:crypto';

export const threads = new Map();
export const nativeThreads = new Map();
const now = Date.now();
function example(id, title, agent, cwd, branch, labels, status, minutes, body, prompt, ticket) {
  threads.set(id, { id, title, agent, cwd, branch, labels, status, ticket,
    source: 'example', nativeId: null, runtimeId: null, unread: true, starred: false, archived: false,
    updated: now - minutes * 60000,
    messages: [
      { id: `${id}-user`, role: 'user', text: prompt, time: now - (minutes + 8) * 60000 },
      { id: `${id}-reply`, role: 'assistant', text: body, time: now - minutes * 60000 },
    ], seenTurns: new Set() });
}
example('example-auth', 'Corriger le refresh de session', 'Codex', '~/projects/relai', 'fix/session-refresh', ['Bug', 'À revoir'], 'response', 4,
  '## Le correctif est prêt à relire\n\nLe cache de session est maintenant vérifié avant chaque utilisation. La conversation reste dans ce même chat.\n\n### Changements proposés\n\n- Vérifier la date d’expiration du token.\n- Garder le contexte de la session après un refresh.\n- Ajouter un test pour une session expirée.\n\n```ts\nif (session.expiresAt <= Date.now()) {\n  return refreshSession(session);\n}\n```\n\n**À vérifier :** le comportement après une longue période d’inactivité.\n\n> Ce Relai est un exemple visuel ; aucun fichier n’a été modifié.',
  'Vérifie pourquoi une session expirée est encore utilisée après le refresh.', 'RELAI-18');
example('example-billing', 'Préciser le parcours des factures', 'Claude Code', '~/projects/billing', 'feat/invoices', ['Produit'], 'question', 16,
  '## Une décision avant de continuer\n\nLe parcours peut garder la facture dans le chat et afficher ses détails dans un volet.\n\n**Faut-il ouvrir le détail au clic sur la ligne, ou conserver un bouton dédié ?**\n\nLe destinataire et les libellés restent visibles dans les deux cas.\n\n> Conversation d’exemple, sans agent connecté.',
  'Propose un parcours simple pour consulter une facture.', 'BILL-42');
example('example-docs', 'Clarifier le guide de contribution', 'Pi', '~/projects/relai', 'docs/contributing', ['Documentation'], 'response', 38,
  '## Une structure plus lisible\n\n1. Installer le projet.\n2. Choisir une tâche.\n3. Vérifier les changements.\n4. Ouvrir la PR.\n\nLe guide distingue maintenant les instructions de lancement des décisions produit.\n\n> Exemple de réponse, pas une modification du dépôt.',
  'Rends le guide de contribution plus facile à parcourir.', 'RELAI-12');
example('example-design', 'Affiner les lignes de l’inbox', 'Codex', '~/projects/relai', 'design/inbox', ['Design', 'À revoir'], 'response', 67,
  '## Une inbox plus claire\n\nChaque ligne montre le **nom du chat**, l’agent, le dossier et la branche. Les libellés et les tickets apportent le contexte sans interrompre la lecture.\n\n| Élément | Rôle |\n| --- | --- |\n| Agent | Identifier le destinataire |\n| Dossier | Situer le travail |\n| Branche | Retrouver le contexte Git |\n\nLe terminal est accessible depuis la conversation ; lire un Relai ne démarre aucun processus.\n\n> Données d’exemple pour valider la présentation.',
  'Garde le style Glass et rends les métadonnées des Relais plus lisibles.', 'RELAI-24');
example('example-tests', 'Relire les tests de recherche', 'Codex', '~/projects/relai', 'feat/search', ['Tests'], 'response', 112,
  '## Points à contrôler\n\n- Recherche par titre et contenu.\n- Filtre par agent, dossier et libellé.\n- Retour à la liste après lecture.\n\n```bash\nnpm test\n```\n\nLes résultats de cette conversation sont fictifs. Le prototype doit encore mesurer les performances sur un grand historique.',
  'Liste les cas importants pour tester la recherche de Relais.', 'RELAI-21');

export function newThread({ title, agent, cwd, branch = '', labels = [], prompt = '', source = 'local', nativeId = null }) {
  const id = randomUUID();
  const thread = { id, title, agent, cwd, branch, labels, nativeId,
    source, runtimeId: null, status: 'session', ticket: '', unread: false,
    starred: false, archived: false, updated: Date.now(), seenTurns: new Set(),
    messages: prompt ? [{ id: `${id}-initial`, role: 'user', text: prompt, time: Date.now(), provisional: true }] : [] };
  threads.set(id, thread);
  if (nativeId) nativeThreads.set(nativeId, id);
  return thread;
}
export function preview(thread) {
  const latest = thread.messages.at(-1);
  return latest ? latest.text.replace(/```[\s\S]*?```/g, ' [code] ').replace(/[#*>`_\[\]]/g, '').replace(/\s+/g, ' ').trim().slice(0, 180)
    : 'Session prête · aucun Relai reçu pour le moment.';
}
export function matchesQuery(thread, query) {
  const fields = { agent: 'agent', harness: 'agent', folder: 'cwd', directory: 'cwd', branch: 'branch', label: 'labels', ticket: 'ticket' };
  let valid = true;
  const free = query.replace(/(\w+):(?:"([^"]*)"|(\S+))/g, (whole, key, quoted, plain) => {
    const field = fields[key.toLowerCase()]; if (!field) return whole;
    const value = String(thread[field]).toLocaleLowerCase();
    if (!value.includes((quoted ?? plain).toLocaleLowerCase())) valid = false;
    return '';
  }).trim().toLocaleLowerCase();
  const text = [thread.title, thread.agent, thread.cwd, thread.branch, thread.ticket, ...thread.labels, ...thread.messages.map(m => m.text)].join(' ').toLocaleLowerCase();
  return valid && free.split(/\s+/).filter(Boolean).every(word => text.includes(word));
}
export function publicThread(thread, runtimes, detail = false) {
  const runtime = runtimes.get(thread.runtimeId);
  const terminalAvailable = Boolean(runtime && !runtime.exited && runtime.currentThreadId === thread.id);
  const { seenTurns, messages, ...data } = thread;
  return { ...data, preview: preview(thread), messageCount: messages.length,
    terminalAvailable, processRunning: terminalAvailable,
    ...(detail ? { messages } : {}) };
}
export function receiveReply(runtime, payload) {
  const nativeId = payload['thread-id'];
  const text = payload['last-assistant-message'];
  if (payload.type !== 'agent-turn-complete' || typeof nativeId !== 'string' || !nativeId
      || typeof text !== 'string' || !text.trim()) throw new Error('Événement de réponse incomplet.');
  let thread = threads.get(nativeThreads.get(nativeId));
  if (!thread) {
    const current = threads.get(runtime.currentThreadId);
    thread = !current.nativeId ? current : newThread({
      title: current.title, agent: current.agent, cwd: current.cwd, branch: current.branch,
      labels: [...current.labels], nativeId, source: current.source,
    });
    thread.nativeId = nativeId; nativeThreads.set(nativeId, thread.id);
  }
  const turn = typeof payload['turn-id'] === 'string' && payload['turn-id']
    ? payload['turn-id'] : randomUUID();
  if (thread.seenTurns.has(turn)) return { thread, duplicate: true };
  thread.seenTurns.add(turn);
  thread.runtimeId = runtime.id; runtime.currentThreadId = thread.id;
  const time = Date.now();
  const inputs = Array.isArray(payload['input-messages']) ? payload['input-messages'].filter(value => typeof value === 'string') : [];
  inputs.forEach((input, i) => {
    const initial = thread.messages.find(message => message.provisional && message.text === input);
    if (initial) { initial.id = `${turn}:user:${i}`; delete initial.provisional; }
    else thread.messages.push({ id: `${turn}:user:${i}`, role: 'user', text: input, time });
  });
  thread.messages.push({ id: `${turn}:assistant`, role: 'assistant', text, time });
  thread.updated = time; thread.status = 'response'; thread.unread = true;
  return { thread, duplicate: false };
}
