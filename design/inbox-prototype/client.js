// PROTOTYPE: structured inbox first; the native terminal is an optional view of the same chat.
const $ = id => document.getElementById(id);
const paths = {
  plus: '<path d="M12 5v14M5 12h14"/>', inbox: '<path d="M4 4h16v16H4zM4 14h5l2 3h2l2-3h5"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/>',
  send: '<path d="m3 3 18 9-18 9 4-9-4-9Zm4 9h14"/>', question: '<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 0 1 6 0c0 2-3 2-3 4m0 3v.01"/>',
  star: '<path d="m12 3 2.8 5.7 6.3.9-4.6 4.5 1.1 6.3-5.6-3-5.6 3 1.1-6.3L2.9 9.6l6.3-.9Z"/>',
  ticket: '<path d="M4 5h16v5a2 2 0 0 0 0 4v5H4v-5a2 2 0 0 0 0-4V5Zm10 0v14"/>',
  archive: '<path d="M4 8h16v12H4zM3 4h18v4H3zM9 12h6"/>', search: '<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>',
  motion: '<path d="M4 7h11a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M5 17h5"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.4 1.4m11.2 11.2L19 19M5 19l1.4-1.4M17.6 6.4 19 5"/>',
  density: '<path d="M4 5h16M4 10h16M4 15h16M4 20h16"/>', folder: '<path d="M3 6h7l2 3h9v11H3V6Z"/>',
  back: '<path d="m10 5-7 7 7 7M3 12h18"/>', tag: '<path d="M3 3h8l10 10-8 8L3 11V3Z"/><circle cx="7" cy="7" r="1"/>',
  up: '<path d="m6 15 6-6 6 6"/>', down: '<path d="m6 9 6 6 6-6"/>',
  terminal: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="m7 8 4 4-4 4m6 0h4"/>',
  reply: '<path d="m9 5-6 6 6 6M3 11h9a8 8 0 0 1 8 8"/>', close: '<path d="m6 6 12 12M6 18 18 6"/>',
  branch: '<circle cx="6" cy="5" r="2"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M6 7v10m0-5c8 0 12-2 12-5"/>',
  tasks: '<path d="m3 6 2 2 3-4m3 2h10M3 13h4m4 0h10M3 20h4m4 0h10"/>',
};
function icon(name) { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.mail}</svg>`; }
document.querySelectorAll('[data-icon]').forEach(element => element.innerHTML = icon(element.dataset.icon));
function esc(value) { return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]); }
function markdown(text) { return DOMPurify.sanitize(marked.parse(text || '', { breaks: true }), { USE_PROFILES: { html: true }, FORBID_TAGS: ['img', 'style', 'form', 'input', 'button'], FORBID_ATTR: ['style'] }); }
function labelColor(label) { return ['Bug', 'Produit', 'Tests'].includes(label) ? 'peach' : ['Documentation', 'À revoir'].includes(label) ? 'teal' : 'lavender'; }
function chips(labels) { return labels.map(label => `<span class="label-chip" data-color="${labelColor(label)}">${esc(label)}</span>`).join(''); }
function agentAvatar(agent) { return `<span class="agent-avatar" data-agent="${esc(agent.split(' ')[0])}">${esc(agent[0])}</span>`; }
function shortFolder(cwd) { const parts = cwd.split('/').filter(Boolean); return parts.slice(-2).join('/'); }
function time(value) { return new Date(value).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }); }
function dateTime(value) { return new Date(value).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); }
const titles = { inbox: 'Inbox', sent: 'Envoyés', questions: 'À répondre', tasks: 'Tâches à revoir', starred: 'Favoris', tickets: 'Tickets', archived: 'Archives' };
let threads = [], agents = [], defaultCwd = '', selected = null, current = null;
let view = 'inbox', label = '', filter = 'all', query = '', source = 'all';
let noticeTimer, searchTimer, listAbort, selectedSequence = 0;
let knownLabels = [], unreadCount = 0, localUnreadCount = 0;
const chosen = new Set(), drafts = new Map(), replyOpen = new Set();
let socket = null, terminal = null, fit = null, hasControl = false, generation = 0, retry = null, terminalThread = null;
function notice(text) { $('notice').textContent = text; $('notice').hidden = false; clearTimeout(noticeTimer); noticeTimer = setTimeout(() => $('notice').hidden = true, 5500); }
async function api(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { 'Content-Type': 'application/json', ...options.headers } });
  const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Action indisponible.'); return data;
}
function visibleThreads() {
  return threads.filter(thread => {
    if (source === 'local' && thread.source === 'example') return false;
    if (source === 'example' && thread.source !== 'example') return false;
    if (view === 'archived' ? !thread.archived : thread.archived) return false;
    if (view === 'starred' && !thread.starred) return false;
    if (view === 'questions' && thread.status !== 'question') return false;
    if (view === 'tasks' && !thread.labels.includes('À revoir')) return false;
    if (view === 'tickets' && !thread.ticket) return false;
    if (view === 'sent' && !thread.messageCount) return false;
    if (label && !thread.labels.includes(label)) return false;
    if (filter === 'unread' && !thread.unread) return false;
    if (filter === 'connected' && !thread.terminalAvailable) return false;
    return true;
  });
}
function renderList() {
  const list = visibleThreads();
  $('list-title').textContent = label || titles[view];
  $('list-count').textContent = `${list.length} ${list.length > 1 ? 'conversations' : 'conversation'}`;
  $('unread-count').textContent = source === 'local' ? localUnreadCount : unreadCount;
  document.querySelectorAll('[data-view]').forEach(button => button.classList.toggle('active', button.dataset.view === view && !label));
  document.querySelectorAll('[data-filter]').forEach(button => button.classList.toggle('active', button.dataset.filter === filter));
  const labels = [...knownLabels].sort((a,b) => a.localeCompare(b));
  $('label-navigation').innerHTML = labels.map(value => `<button class="label-nav ${label === value ? 'active' : ''}" data-label="${esc(value)}"><span class="label-dot" data-color="${labelColor(value)}"></span>${esc(value)}</button>`).join('');
  $('mail-list').innerHTML = list.map(thread => {
    const status = thread.status === 'question' ? 'À répondre' : thread.status === 'session' ? 'Session créée' : 'Réponse reçue';
    return `<div class="mail-row ${thread.unread ? 'unread' : ''} ${chosen.has(thread.id) ? 'chosen' : ''}" role="listitem">
      <input class="row-checkbox" type="checkbox" data-select="${esc(thread.id)}" aria-label="Sélectionner ${esc(thread.title)}" ${chosen.has(thread.id) ? 'checked' : ''}>
      <button class="icon-button star-button ${thread.starred ? 'active' : ''}" data-star="${esc(thread.id)}" aria-label="${thread.starred ? 'Retirer des favoris' : 'Ajouter aux favoris'}">${icon('star')}</button>
      <button class="mail-open" data-open="${esc(thread.id)}" aria-label="Lire ${esc(thread.title)}, ${esc(thread.agent)}, ${esc(shortFolder(thread.cwd))}">
        <span class="sender">${agentAvatar(thread.agent)}<div><span class="sender-name">${esc(thread.agent)}</span><span class="sender-folder" title="${esc(thread.cwd)}">${esc(shortFolder(thread.cwd))}</span></div></span>
        <span class="mail-copy"><span class="mail-title">${esc(thread.title)}</span><span class="mail-preview">${esc(thread.preview)}</span><span class="mail-context">${thread.branch ? `<span class="branch">${icon('branch')}${esc(thread.branch)}</span>` : ''}${thread.ticket ? `<span class="ticket">${esc(thread.ticket)}</span>` : ''}${thread.source === 'example' ? '<span class="source">Exemple</span>' : thread.source === 'test' ? '<span class="source">Vérification Bash</span>' : ''}</span></span>
        <span class="row-labels">${chips(thread.labels)}</span><span class="mail-meta"><time datetime="${new Date(thread.updated).toISOString()}">${time(thread.updated)}</time><span class="mail-status ${esc(thread.status)}"><i></i>${status}</span></span>
      </button><button class="icon-button row-archive" data-archive="${esc(thread.id)}" aria-label="${thread.archived ? 'Restaurer' : 'Archiver'} ${esc(thread.title)}">${icon('archive')}</button></div>`;
  }).join('');
  $('mail-list').hidden = list.length === 0; $('empty-state').hidden = list.length !== 0;
  $('empty-text').textContent = source === 'local' && !query ? 'Les réponses des sessions lancées dans Relai seront affichées ici. New session crée un chat uniquement à votre demande.' : 'Essayez une autre recherche ou changez les filtres.';
  $('select-all').checked = list.length > 0 && list.every(thread => chosen.has(thread.id));
  $('bulk-actions').hidden = chosen.size === 0; $('filter-tabs').hidden = chosen.size > 0;
  $('mail-list').querySelectorAll('[data-open]').forEach(button => button.onclick = () => openThread(button.dataset.open));
  $('mail-list').querySelectorAll('[data-select]').forEach(input => input.onchange = () => { input.checked ? chosen.add(input.dataset.select) : chosen.delete(input.dataset.select); renderList(); });
  $('mail-list').querySelectorAll('[data-star]').forEach(button => button.onclick = () => mutate(button.dataset.star, { starred: !threads.find(t => t.id === button.dataset.star).starred }));
  $('mail-list').querySelectorAll('[data-archive]').forEach(button => button.onclick = () => mutate(button.dataset.archive, { archived: !threads.find(t => t.id === button.dataset.archive).archived }));
  $('label-navigation').querySelectorAll('[data-label]').forEach(button => button.onclick = () => { label = button.dataset.label; view = 'inbox'; filter = 'all'; chosen.clear(); returnToInbox(); renderList(); });
  const index = list.findIndex(thread => thread.id === selected);
  $('previous-thread').disabled = index <= 0; $('next-thread').disabled = index < 0 || index >= list.length - 1;
}
async function refreshList() {
  listAbort?.abort(); const abort = new AbortController(); listAbort = abort;
  try {
    const data = await api(`/api/inbox?q=${encodeURIComponent(query)}`, { signal: abort.signal });
    if (listAbort !== abort) return;
    threads = data.threads; agents = data.agents; defaultCwd = data.defaultCwd;
    knownLabels = data.labels; unreadCount = data.unreadCount; localUnreadCount = data.localUnreadCount;
    $('terminal-count').textContent = `${data.activeTerminals} ${data.activeTerminals > 1 ? 'terminaux actifs' : 'terminal actif'}`;
    $('new-session').disabled = agents.length === 0; renderList();
  } catch (error) { if (error.name !== 'AbortError') notice(error.message); }
}
async function mutate(id, patch) {
  try {
    const data = await api(`/api/thread?id=${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(patch) });
    const index = threads.findIndex(thread => thread.id === id); if (index >= 0) threads[index] = data;
    if (selected === id) { current = data; renderHeader(); }
    renderList(); return data;
  } catch (error) { notice(error.message); }
}
function renderHeader() {
  if (!current) return;
  $('thread-title').textContent = current.title;
  $('thread-crumb').textContent = `${current.agent} / ${shortFolder(current.cwd)}`;
  $('thread-source').textContent = current.source === 'example' ? 'Exemple' : current.source === 'test' ? 'Vérification' : 'Conversation locale';
  $('recipient').innerHTML = `<span class="recipient-agent">${agentAvatar(current.agent)}${esc(current.agent)}</span><span class="context-pill folder" title="${esc(current.cwd)}">${icon('folder')}<span>${esc(current.cwd)}</span></span>${current.branch ? `<span class="context-pill branch">${icon('branch')}${esc(current.branch)}</span>` : ''}${current.ticket ? `<span class="context-pill ticket">${icon('ticket')}${esc(current.ticket)}</span>` : ''}`;
  $('thread-labels').innerHTML = chips(current.labels);
  $('star-thread').classList.toggle('active', current.starred);
  $('star-thread').setAttribute('aria-label', current.starred ? 'Retirer des favoris' : 'Ajouter aux favoris');
  $('archive-thread').setAttribute('aria-label', current.archived ? 'Restaurer la conversation' : 'Archiver la conversation');
  $('show-terminal').disabled = !current.terminalAvailable;
  $('show-terminal').title = current.terminalAvailable ? 'Retrouver le terminal existant de ce chat' : 'Aucun terminal actif lié à ce chat ; la lecture reste disponible.';
  $('terminal-availability').textContent = current.terminalAvailable ? 'Même session · terminal disponible' : 'Lecture disponible · terminal non connecté';
  $('reply-recipient').textContent = `→ ${current.agent}`;
  $('copy-and-open').disabled = !current.terminalAvailable;
  $('reply-hint').textContent = current.terminalAvailable ? 'Le prompt sera copié pour être collé dans le terminal de ce même chat.' : 'Préparez ou copiez votre prompt. Aucun terminal actif n’est relié à cette conversation.';
  $('add-label').disabled = false;
}
function renderMessages() {
  if (!current) return;
  $('messages').innerHTML = current.messages.length ? current.messages.map(message => `<article class="message ${message.role === 'user' ? 'outgoing' : 'incoming'}"><div class="message-meta"><span class="message-avatar">${message.role === 'user' ? 'U' : esc(current.agent[0])}</span><strong>${message.role === 'user' ? 'Vous' : esc(current.agent)}</strong><span>→ ${message.role === 'user' ? esc(current.agent) : 'vous'}</span><time datetime="${new Date(message.time).toISOString()}">${dateTime(message.time)}</time></div><div class="message-content markdown">${markdown(message.text)}</div></article>`).join('')
    : '<div class="reader-empty"><strong>Votre chat est prêt.</strong><p>Le terminal de cette session est disponible. Ses réponses apparaîtront ici, dans cette même conversation.</p></div>';
  $('messages').querySelectorAll('a').forEach(a => { a.target = '_blank'; a.rel = 'noopener noreferrer'; });
  if (document.activeElement !== $('reply-text')) $('reply-text').value = drafts.get(selected) || '';
  $('reply-editor').hidden = !replyOpen.has(selected);
}
async function loadSelected() {
  const id = selected, sequence = ++selectedSequence;
  if (!id) return;
  try {
    const data = await api(`/api/thread?id=${encodeURIComponent(id)}`);
    if (selected !== id || sequence !== selectedSequence) return;
    current = data; renderHeader(); renderMessages();
  } catch (error) { notice(error.message); }
}
async function openThread(id) {
  if (selected !== id) {
    disconnectTerminal(); current = null;
    $('reply-text').hidden = false; $('reply-preview').hidden = true;
    $('preview-prompt').setAttribute('aria-pressed', 'false');
    $('preview-prompt').textContent = 'Aperçu Markdown';
  }
  selected = id; selectedSequence++;
  document.body.classList.remove('terminal-focus'); $('focus').setAttribute('aria-pressed', 'false');
  $('list-panel').hidden = true; $('thread').hidden = false; showReader();
  history.replaceState(null, '', `${location.pathname}${location.search}#chat=${encodeURIComponent(id)}`);
  await loadSelected();
  if (selected !== id) return;
  if (current?.unread) await mutate(id, { unread: false });
  renderList(); $('reader-body').scrollTop = 0; $('back').focus();
}
function returnToInbox() {
  disconnectTerminal(); selected = null; current = null; selectedSequence++;
  document.body.classList.remove('terminal-focus'); $('focus').setAttribute('aria-pressed', 'false');
  $('thread').hidden = true; $('list-panel').hidden = false; $('add-label').disabled = true;
  history.replaceState(null, '', location.pathname + location.search); renderList();
}
function showReader() {
  document.body.classList.remove('terminal-focus'); $('focus').setAttribute('aria-pressed', 'false'); $('focus').textContent = 'Mode focus';
  $('reader-body').hidden = false; $('terminal-panel').hidden = true;
  $('show-message').classList.add('active'); $('show-terminal').classList.remove('active');
}
function terminalTheme() {
  const dark = document.documentElement.dataset.theme === 'dark';
  return dark ? { background: '#171b24', foreground: '#eef1f6', cursor: '#b4dcd4', selectionBackground: '#b4dcd43a',
    black:'#232936', red:'#e7a1a5', green:'#b4dcd4', yellow:'#e6c1a8', blue:'#a6c4ee', magenta:'#c3bae6', cyan:'#a3d9e0', white:'#e2e7f0',
    brightBlack:'#9ca9bd', brightRed:'#f1b1b6', brightGreen:'#c4ebdc', brightYellow:'#f2d4aa', brightBlue:'#b5d3ff', brightMagenta:'#d5c6f3', brightCyan:'#b8e7f0', brightWhite:'#ffffff' }
    : { background:'#f5f7fa', foreground:'#252936', cursor:'#346e65', selectionBackground:'#346e6533',
      black:'#252936',red:'#a23b47',green:'#346e65',yellow:'#94613d',blue:'#325f9f',magenta:'#71628f',cyan:'#2c6a7a',white:'#5d6677',
      brightBlack:'#667083',brightRed:'#a53242',brightGreen:'#2c6857',brightYellow:'#8b6029',brightBlue:'#285caa',brightMagenta:'#79599f',brightCyan:'#266a7c',brightWhite:'#252936' };
}
function disconnectTerminal() {
  generation++; clearTimeout(retry); socket?.close(); socket = null;
  terminal?.dispose(); terminal = null; fit = null; terminalThread = null; hasControl = false;
}
function send(data) { if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(data)); }
function resize() {
  if (!terminal || !fit || $('terminal-panel').hidden || !hasControl) return;
  fit.fit(); send({ type: 'resize', cols: terminal.cols, rows: terminal.rows });
}
async function showTerminal() {
  if (!selected) return;
  const id = selected;
  try {
    const data = await api(`/api/thread?id=${encodeURIComponent(id)}`);
    if (id !== selected) return;
    current = data; renderHeader();
    if (!data.terminalAvailable) { notice('Aucun terminal actif n’est relié à ce chat. Aucun agent n’a été lancé.'); return; }
    $('reader-body').hidden = true; $('terminal-panel').hidden = false;
    $('show-message').classList.remove('active'); $('show-terminal').classList.add('active');
    $('terminal-name').textContent = `${current.agent} · ${current.title}`;
    if (terminal && terminalThread === id) { requestAnimationFrame(resize); terminal.focus(); return; }
    disconnectTerminal(); terminalThread = id;
    terminal = new Terminal({ cols:100,rows:30,cursorBlink:true,fontSize:innerWidth<700?11:14,lineHeight:1.35,
      fontFamily:'"DejaVu Sans Mono", "Liberation Mono", Consolas, monospace',scrollback:3000,
      minimumContrastRatio:4.5,theme:terminalTheme() });
    fit = new FitAddon.FitAddon(); terminal.loadAddon(fit); terminal.open($('terminal'));
    terminal.onData(data => {
      if (!hasControl) return;
      const bytes = new TextEncoder().encode(data);
      for (let offset=0;offset<bytes.length;offset+=32768) send({type:'input',data:btoa(String.fromCharCode(...bytes.subarray(offset,offset+32768)))});
    });
    terminal.onBinary(data => { if (hasControl) send({type:'input',data:btoa(data)}); });
    terminal.attachCustomKeyEventHandler(event => {
      if ((event.ctrlKey||event.metaKey)&&event.shiftKey&&event.key.toLowerCase()==='f') { if(event.type==='keydown') $('focus').click(); return false; }
      return true;
    });
    connectTerminal(id,generation);
  } catch(error) { notice(error.message); }
}
function connectTerminal(id,token) {
  if (generation!==token||selected!==id) return;
  $('control-status').textContent='Connexion au terminal existant…';
  const ws = new WebSocket(`${location.protocol==='https:'?'wss':'ws'}://${location.host}/terminal?id=${encodeURIComponent(id)}`); socket=ws;
  ws.onmessage=event=>{
    if(generation!==token) return;
    const message=JSON.parse(event.data);
    if(message.type==='snapshot') { terminal.reset();terminal.resize(message.cols,message.rows);terminal.write(message.data,()=>terminal?.focus()); }
    if(message.type==='output') terminal.write(Uint8Array.from(atob(message.data),char=>char.charCodeAt(0)));
    if(message.type==='state') {
      if(message.threadId!==selected) { disconnectTerminal();showReader();loadSelected();refreshList();notice('Le CLI a changé de chat. Le contenu de ce Relai reste conservé.');return; }
      const previous=hasControl;hasControl=message.control&&message.running;terminal.options.disableStdin=!hasControl;
      $('control-status').textContent=message.running?(hasControl?'Vous contrôlez cette session':'Lecture seule · autre panneau actif'):'Processus arrêté';
      $('claim').hidden=hasControl||!message.running;$('stop').disabled=!message.running;
      if(hasControl&&!previous) requestAnimationFrame(resize);
    }
    if(message.type==='size') { terminal.resize(message.cols,message.rows);$('dimensions').textContent=`${message.cols} × ${message.rows}`; }
    if(message.type==='exit') { hasControl=false;terminal.options.disableStdin=true;loadSelected();refreshList(); }
  };
  ws.onclose=()=>{
    if(generation!==token||selected!==id) return;
    hasControl=false;terminal.options.disableStdin=true;$('control-status').textContent='Connexion interrompue';
    retry=setTimeout(async()=>{
      try { const data=await api(`/api/thread?id=${encodeURIComponent(id)}`); if(generation!==token) return;
        if(data.terminalAvailable) connectTerminal(id,token); else {current=data;renderHeader();$('control-status').textContent='Terminal indisponible · conversation conservée';} }
      catch {if(generation===token) retry=setTimeout(()=>connectTerminal(id,token),2000);}
    },1500);
  };
  ws.onerror=()=>{};
}
async function copyPrompt() {
  const text=$('reply-text').value.trim();if(!text){$('reply-text').focus();throw new Error('Écrivez un prompt avant de le copier.');}
  await navigator.clipboard.writeText(text);return text;
}
function openLabels() {
  if(!current) return;
  const labels=[...new Set([...knownLabels,...current.labels])].sort();
  $('label-options').innerHTML=labels.map(label=>`<label><input type="checkbox" value="${esc(label)}" ${current.labels.includes(label)?'checked':''}>${chips([label])}</label>`).join('');
  $('new-label-name').value='';$('label-dialog').showModal();
}
$('back').onclick=returnToInbox;$('show-message').onclick=showReader;$('show-terminal').onclick=showTerminal;
document.querySelectorAll('[data-view]').forEach(button=>button.onclick=()=>{view=button.dataset.view;label='';filter='all';chosen.clear();returnToInbox();});
document.querySelectorAll('[data-filter]').forEach(button=>button.onclick=()=>{filter=button.dataset.filter;chosen.clear();renderList();});
$('search').oninput=()=>{query=$('search').value;chosen.clear();clearTimeout(searchTimer);searchTimer=setTimeout(refreshList,120);};
$('source-filter').onchange=()=>{source=$('source-filter').value;chosen.clear();renderList();};
$('reset-filters').onclick=()=>{query='';label='';filter='all';source='all';$('search').value='';$('source-filter').value='all';refreshList();};
$('select-all').onchange=()=>{chosen.clear();if($('select-all').checked) visibleThreads().forEach(t=>chosen.add(t.id));renderList();};
async function bulk(patch) { const ids=[...chosen];chosen.clear();for(const id of ids) await mutate(id,patch);renderList(); }
$('bulk-read').onclick=()=>bulk({unread:false});$('bulk-archive').onclick=()=>bulk({archived:true});
$('star-thread').onclick=()=>mutate(selected,{starred:!current.starred});
$('archive-thread').onclick=async()=>{await mutate(selected,{archived:!current.archived});returnToInbox();};
$('label-thread').onclick=openLabels;$('add-label').onclick=openLabels;
$('label-form').onsubmit=async event=>{event.preventDefault();const labels=[...$('label-options').querySelectorAll('input:checked')].map(input=>input.value);const value=$('new-label-name').value.trim();if(value) labels.push(value);await mutate(selected,{labels});$('label-dialog').close();};
$('previous-thread').onclick=()=>{const list=visibleThreads(),index=list.findIndex(t=>t.id===selected);if(index>0) openThread(list[index-1].id);};
$('next-thread').onclick=()=>{const list=visibleThreads(),index=list.findIndex(t=>t.id===selected);if(index>=0&&index<list.length-1) openThread(list[index+1].id);};
$('reply-toggle').onclick=()=>{const open=$('reply-editor').hidden;$('reply-editor').hidden=!open;open?replyOpen.add(selected):replyOpen.delete(selected);if(open) $('reply-text').focus();};
$('reply-text').oninput=()=>{drafts.set(selected,$('reply-text').value);if(!$('reply-preview').hidden) $('reply-preview').innerHTML=markdown($('reply-text').value);};
$('preview-prompt').onclick=()=>{const preview=$('reply-preview').hidden;$('reply-preview').hidden=!preview;$('reply-text').hidden=preview;$('reply-preview').innerHTML=markdown($('reply-text').value);$('preview-prompt').setAttribute('aria-pressed',preview);$('preview-prompt').textContent=preview?'Modifier le prompt':'Aperçu Markdown';};
$('copy-prompt').onclick=async()=>{try{await copyPrompt();notice('Prompt copié pour ce destinataire.');}catch(error){notice(error.message);}};
$('copy-and-open').onclick=async()=>{try{await copyPrompt();await showTerminal();notice('Prompt copié. Collez-le dans la saisie de votre agent pour poursuivre ce chat.');}catch(error){notice(error.message);}};
$('claim').onclick=()=>{send({type:'claim'});terminal?.focus();};
$('reconnect').onclick=()=>{disconnectTerminal();showTerminal();};
$('focus').onclick=()=>{const focus=document.body.classList.toggle('terminal-focus');$('focus').setAttribute('aria-pressed',focus);$('focus').textContent=focus?'Quitter le focus':'Mode focus';requestAnimationFrame(resize);};
$('stop').onclick=async()=>{if(!confirm('Arrêter cette session ? La conversation sera conservée. Fermer le panneau suffit pour laisser l’agent travailler.'))return;try{await api(`/api/stop?id=${encodeURIComponent(selected)}`,{method:'POST'});}catch(error){notice(error.message);}};
$('theme').onclick=()=>{const dark=document.documentElement.dataset.theme!=='dark';document.documentElement.dataset.theme=dark?'dark':'light';$('theme').setAttribute('aria-label',dark?'Passer au thème clair':'Passer au thème sombre');if(terminal)terminal.options.theme=terminalTheme();};
$('motion').onclick=()=>{const paused=document.body.classList.toggle('motion-off');$('motion').setAttribute('aria-pressed',paused);$('motion').setAttribute('aria-label',paused?'Activer le fond animé':'Suspendre le fond animé');};
$('density').onclick=()=>{const compact=document.body.classList.toggle('density-compact');$('density').setAttribute('aria-pressed',compact);$('density').setAttribute('aria-label',compact?'Activer la densité confortable':'Activer la densité compacte');};
document.querySelectorAll('[data-close]').forEach(button=>button.onclick=()=>$(button.dataset.close).close());
$('new-session').onclick=()=>{$('compose-form').reset();$('compose-error').hidden=true;$('compose-directory').value=defaultCwd;$('compose-agent').innerHTML=agents.map(agent=>`<option value="${esc(agent)}">${agent==='bash'?'Bash · vérification':'Codex'}</option>`).join('');$('create-session').textContent='Créer la session';$('compose-dialog').showModal();};
$('compose-prompt').oninput=()=>{$('create-session').textContent=$('compose-prompt').value.trim()?'Créer et envoyer':'Créer la session';};
$('compose-form').onsubmit=async event=>{
  event.preventDefault();$('create-session').disabled=true;$('compose-error').hidden=true;
  try { const data=await api('/api/sessions',{method:'POST',body:JSON.stringify({title:$('compose-title').value,agent:$('compose-agent').value,cwd:$('compose-directory').value,label:$('compose-label').value,ticket:$('compose-ticket').value,prompt:$('compose-prompt').value})});
    $('compose-dialog').close();source='local';$('source-filter').value='local';query='';$('search').value='';view='inbox';label='';filter='all';await refreshList();await openThread(data.id);
    notice('Session créée. Ses réponses resteront dans cette conversation.');
  } catch(error){$('compose-error').textContent=error.message;$('compose-error').hidden=false;}
  finally{$('create-session').disabled=false;}
};
document.addEventListener('keydown',event=>{
  if(event.target.closest('.xterm'))return;
  if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){event.preventDefault();$('search').focus();}
  if(event.key==='Escape'&&!document.querySelector('dialog[open]')&&selected&&!event.target.closest('input,textarea'))returnToInbox();
});
new ResizeObserver(()=>requestAnimationFrame(resize)).observe($('terminal'));
const events=new EventSource('/events');
events.onopen=()=>{$('receive-status').classList.remove('disconnected');$('receive-status').querySelector('span').textContent='Réception active';};
events.onerror=()=>{$('receive-status').classList.add('disconnected');$('receive-status').querySelector('span').textContent='Reconnexion…';};
events.onmessage=async event=>{
  const change=JSON.parse(event.data);await refreshList();
  if(change.threadId===selected&&['message','process'].includes(change.reason)){await loadSelected();if(change.reason==='message'&&current?.unread)await mutate(selected,{unread:false});}
};
refreshList().then(()=>{const hash=new URLSearchParams(location.hash.slice(1));const id=hash.get('chat');if(id)openThread(id);});
