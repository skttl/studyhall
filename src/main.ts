import './style.css';
import { type Collection, type Snapshot, type Doc, documents, startDocument, findDocument, resolveLocal, documentURL, searchDocuments, order } from './model';
import { loadSource, SourceError } from './sources';
import { getCollections, saveCollection, removeCollection } from './storage';
import { t, language, setLanguage, dictionaries, type Language, type Key } from './i18n';
import { renderMarkdown, renderDiagrams, escapeHTML as esc, type Heading } from './render';

const icon = '<svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect width="8" height="18" x="3" y="3" rx="1"/><path d="M7 3v18"/><path d="M20.4 18.9c.2.5-.1 1.1-.6 1.3l-1.9.7c-.5.2-1.1-.1-1.3-.6L11.1 5.1c-.2-.5.1-1.1.6-1.3l1.9-.7c.5-.2 1.1.1 1.3.6Z"/></svg>';
const app = document.querySelector<HTMLDivElement>('#app')!;
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
let collections: Collection[] = [], current: Collection | undefined, snapshot: Snapshot | undefined, docs: Doc[] = [];
let busy = false, errorKey: Key | undefined, operation = 0, headings: Heading[] = [], checkedAt: Date | undefined;
let urls: string[] = [], noticeTimer: ReturnType<typeof setTimeout> | undefined;
let updateWorker: ServiceWorker | undefined;
const supported = 'showDirectoryPicker' in window && 'showOpenFilePicker' in window;
const route = () => new URL(location.href).searchParams;
const path = () => route().get('doc') || '';
const button = (action: string, label: Key, extra = '') => `<button type="button" data-action="${action}" ${extra}>${esc(t(label))}</button>`;
const openButtons = () => `<button type="button" class="primary" data-open="directory">${esc(t('openFolder'))}</button><button type="button" data-open="file">${esc(t('openZip'))}</button>`;
function notify(message: string) {
  $('toast').textContent = message;
  clearTimeout(noticeTimer); noticeTimer = setTimeout(() => { if ($('toast')) $('toast').textContent = ''; }, 6000);
}
function clearURLs() { urls.forEach(url => URL.revokeObjectURL(url)); urls = []; }
function objectURL(file: File, path: string) {
  const ext = path.split('.').pop()?.toLowerCase();
  const mime: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml', avif: 'image/avif', bmp: 'image/bmp', ico: 'image/x-icon' };
  if (!ext || !mime[ext]) return undefined;
  const url = URL.createObjectURL(file.slice(0, file.size, mime[ext])); urls.push(url); return url;
}
function treeHTML() {
  interface Branch { files: Doc[]; children: Map<string, Branch> }
  const root: Branch = { files: [], children: new Map() };
  for (const doc of docs) {
    const parts = doc.path.split('/'); parts.pop(); let node = root;
    for (const part of parts) { if (!node.children.has(part)) node.children.set(part, { files: [], children: new Map() }); node = node.children.get(part)!; }
    node.files.push(doc);
  }
  function branch(node: Branch, prefix: string): string {
    return [...node.children].sort(([a], [b]) => order.compare(a, b)).map(([name, child]) => {
      const folder = prefix + name + '/';
      return `<details ${path().startsWith(folder) ? 'open' : ''}><summary>${esc(name)}</summary><div class="branch">${branch(child, folder)}</div></details>`;
    }).join('') + node.files.sort((a, b) => order.compare(a.path, b.path)).map(doc =>
      `<a href="${esc(documentURL(current!.id, doc.path))}" data-doc="${esc(doc.path)}" ${doc.path === path() ? 'aria-current="page"' : ''} title="${esc(doc.path)}">${esc(doc.title)}</a>`).join('');
  }
  return `<a href="${esc(documentURL(current!.id, ''))}" data-doc="" ${!path() ? 'aria-current="page"' : ''}>${esc(t('overview'))}</a>` + branch(root, '');
}
function renderShell() {
  setLanguage(language);
  const unknown = route().has('collection') && !current;
  app.innerHTML = `<a class="skip" href="#content">${esc(t('skip'))}</a>
    <header><a class="brand" href="/" data-home>${icon}<span>StudyHall</span></a><div class="header-actions"><span class="connection">${esc(t(navigator.onLine ? 'online' : 'offline'))}</span><button id="search-open" data-action="search" ${docs.length ? '' : 'disabled'}>${esc(t('search'))}<kbd>Ctrl K</kbd></button></div></header>
    <div id="update-banner" class="update-banner" ${updateWorker ? '' : 'hidden'}><span>${esc(t('updateReady'))}</span>${button('update', 'updateNow')}${button('dismissUpdate', 'dismiss')}</div>
    <div class="layout"><aside class="sidebar" aria-label="${esc(t('collections'))}">
      <label class="label" for="collection">${esc(t('collections'))}</label>
      <select id="collection" aria-label="${esc(t('collections'))}"><option value="">StudyHall</option>${collections.map(c => `<option value="${esc(c.id)}" ${c.id === current?.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select>
      <div class="source-path">${current ? esc(current.name) + (current.kind === 'directory' ? ' /' : '') : ''}</div>
      <nav id="tree" class="tree" aria-label="${esc(t('collections'))}">${current && snapshot ? treeHTML() : ''}</nav>
      <div class="sidebar-footer"><div class="open-actions">${openButtons()}</div>
      ${current ? `<details class="source-actions"><summary>${esc(t('actions'))}</summary>${button('reconnect', 'reconnect')}${button('forget', 'forget', `title="${esc(t('forgetText'))}"`)}</details>` : ''}
      <label class="language"><span>${esc(t('language'))}</span><select id="language" aria-label="${esc(t('language'))}">${Object.keys(dictionaries).map(code => `<option value="${code}" ${code === language ? 'selected' : ''}>${({ en: 'English', da: 'Dansk', de: 'Deutsch' } as const)[code as Language]}</option>`).join('')}</select></label><p>${esc(t('localOnly'))}</p></div>
    </aside><main id="content" tabindex="-1"><div id="source-status" role="status"></div><div class="document-toolbar"><span id="breadcrumb"></span>${button('copy', 'copyLink')}</div><article id="article"></article></main>
    <aside class="right"><h2>${esc(t('onThisPage'))}</h2><nav class="toc" id="toc" aria-label="${esc(t('onThisPage'))}"></nav><div class="refresh"><button id="refresh" data-action="refresh" ${!current || busy ? 'disabled' : ''}>↻ ${esc(t('refresh'))}</button><p id="checked"></p></div></aside></div>
    <dialog id="search-dialog" aria-labelledby="search-title"><div class="dialog-title"><h2 id="search-title">${esc(t('search'))}</h2>${button('closeSearch', 'close')}</div><div class="dialog-body"><input id="search-input" type="search" placeholder="${esc(t('searchPlaceholder'))}" aria-label="${esc(t('search'))}"><p id="search-count" class="muted"></p><div id="search-results"></div></div></dialog>
    <div id="toast" class="toast" role="status"></div>`;
  renderStatus();
  if (snapshot) renderPage(false);
  else {
    clearURLs(); headings = []; document.title = 'StudyHall';
    $('article').innerHTML = `<div class="welcome">${icon}<h1>${esc(t(unknown ? 'unknownCollection' : current ? 'openSource' : 'welcomeTitle'))}</h1><p>${esc(t(current ? 'permission' : 'welcomeText'))}</p><div class="welcome-actions">${openButtons()}</div><p class="drop-hint">${esc(t('dropHint'))}</p>${!supported ? `<p class="support-note">${esc(t('supported'))}</p>` : ''}${collections.length && !current ? `<div class="recent">${collections.map(c => `<button data-collection="${esc(c.id)}">${esc(c.name)} <span>→</span></button>`).join('')}</div>` : ''}</div>`;
    document.querySelector('.document-toolbar')?.setAttribute('hidden', '');
  }
}
function renderStatus() {
  const status = $('source-status'); if (!status) return;
  status.innerHTML = busy ? `<p class="status-line">${esc(t('loading'))}</p>` : errorKey ? `<div class="notice"><p>${esc(t(errorKey))}</p>${errorKey === 'permission' ? button('authorize', 'authorize') : ''}${current ? button('reconnect', 'reconnect') : ''}</div>` : '';
  $('content')?.setAttribute('aria-busy', String(busy));
  const refresh = $('refresh') as HTMLButtonElement; if (refresh) refresh.disabled = busy || !current;
  if ($('checked')) $('checked').textContent = checkedAt ? t('updated', { time: new Intl.DateTimeFormat(language, { hour: '2-digit', minute: '2-digit' }).format(checkedAt) }) : '';
}
function renderPage(scroll = true) {
  if (!current || !snapshot) return;
  const doc = docs.find(d => d.path === path());
  const article = $('article');
  clearURLs();
  $('breadcrumb').textContent = current.name + (doc ? ' / ' + (doc.path.includes('/') ? doc.path.slice(0, doc.path.lastIndexOf('/')) : doc.path) : ' / ' + t('overview'));
  document.title = (doc?.title || t('overview')) + ' · StudyHall';
  headings = [];
  if (path() && !doc) {
    article.innerHTML = `<h1>${esc(t('notFound', { path: path() }))}</h1><p>${esc(t('missingDocument'))}</p><a data-doc="" href="${esc(documentURL(current.id, ''))}">${esc(t('overview'))}</a>`;
  } else if (doc) {
    const rendered = renderMarkdown(doc.text); headings = rendered.headings;
    article.innerHTML = `<div class="document-body">${rendered.html}</div><div class="doc-meta">${esc(doc.path)}</div>`;
    if (!article.querySelector('h1')) { const title = document.createElement('h1'); title.textContent = doc.title; article.prepend(title); }
    decorateContent(article, doc.path);
    const index = docs.indexOf(doc);
    article.insertAdjacentHTML('beforeend', `<nav class="pager" aria-label="${esc(t('collections'))}">${index > 0 ? `<a data-doc="${esc(docs[index - 1].path)}" href="${esc(documentURL(current.id, docs[index - 1].path))}"><small>${esc(t('previous'))}</small>← ${esc(docs[index - 1].title)}</a>` : '<span></span>'}${index < docs.length - 1 ? `<a data-doc="${esc(docs[index + 1].path)}" href="${esc(documentURL(current.id, docs[index + 1].path))}"><small>${esc(t('next'))}</small>${esc(docs[index + 1].title)} →</a>` : ''}</nav>`);
    void renderDiagrams(article).then(() => { if (scroll) scrollToAnchor(); }).catch(() => notify(t('diagramError')));
  } else {
    article.innerHTML = `<h1>${esc(t(docs.length ? 'overview' : 'noDocuments'))}</h1><p class="lead">${esc(t(docs.length ? 'overviewText' : 'noDocumentsText'))}</p><p class="muted">${esc(t('overviewAutomatic'))}</p><div class="document-list">${docs.map(d => `<a data-doc="${esc(d.path)}" href="${esc(documentURL(current!.id, d.path))}"><strong>${esc(d.title)}</strong><small>${esc(d.path)}</small></a>`).join('')}</div>`;
  }
  $('toc').innerHTML = headings.map(h => `<a class="depth-${h.level}" href="#${encodeURIComponent(h.id)}" data-anchor-link="${esc(h.id)}">${esc(h.title)}</a>`).join('');
  $('tree').innerHTML = treeHTML();
  if (scroll) { window.scrollTo(0, 0); scrollToAnchor(); }
  syncSection();
}
function decorateContent(article: HTMLElement, from: string) {
  article.querySelectorAll<HTMLAnchorElement>('.document-body a').forEach(a => {
    const href = a.getAttribute('href');
    if (!href) return;
    const target = resolveLocal(from, href);
    if (target.kind === 'external') { a.href = target.url; a.target = '_blank'; a.rel = 'noopener noreferrer'; return; }
    if (target.kind === 'local') {
      const doc = findDocument(docs, target.path);
      if (doc) { a.href = documentURL(current!.id, doc.path, target.hash); a.dataset.doc = doc.path; a.dataset.hash = target.hash; return; }
      a.dataset.linkError = snapshot!.files.has(target.path) ? 'unsupportedFile' : 'notFound';
    } else a.dataset.linkError = target.kind === 'outside' ? 'outside' : 'blocked';
    a.dataset.original = href; a.href = '#';
  });
  article.querySelectorAll<HTMLImageElement>('img').forEach(img => {
    const src = img.getAttribute('data-studyhall-image') || '';
    // Re-resolve every image; raw HTML cannot load data:, blob: or other active schemes.
    const target = resolveLocal(from, src);
    img.removeAttribute('src'); img.removeAttribute('srcset'); img.loading = 'lazy'; img.referrerPolicy = 'no-referrer';
    if (target.kind === 'external' && /^https?:/i.test(target.url)) img.src = target.url;
    else if (target.kind === 'local') {
      const file = snapshot!.files.get(target.path); const url = file && objectURL(file, target.path);
      if (url) img.src = url;
    }
    img.onerror = () => { const fallback = document.createElement('span'); fallback.className = 'image-error'; fallback.textContent = t('imageUnavailable', { path: src }); img.replaceWith(fallback); };
    if (!img.hasAttribute('src')) img.onerror(new Event('error'));
  });
}
function anchorElement(id: string) { const el = document.getElementById('document-' + id); return el && $('article')?.contains(el) ? el : undefined; }
function scrollToAnchor() {
  if (!location.hash) return;
  try { anchorElement(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView(); } catch { /* A malformed or removed fragment leaves the page readable. */ }
}
function syncSection() {
  const links = [...document.querySelectorAll<HTMLAnchorElement>('#toc a')];
  let active = links[0];
  for (const link of links) if ((anchorElement(link.dataset.anchorLink!)?.getBoundingClientRect().top ?? Infinity) <= 130) active = link;
  for (const link of links) { if (link === active) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current'); }
}
function navigate(doc: string, hash = '') {
  if (!current) return;
  history.pushState({}, '', documentURL(current.id, doc, hash)); renderPage(); $('content').focus({ preventScroll: true });
}
async function activate(collection: Collection, ask = false) {
  const token = ++operation;
  if (current?.id !== collection.id) { snapshot = undefined; docs = []; checkedAt = undefined; }
  current = collection; errorKey = undefined; busy = true; renderShell();
  try {
    const permission = ask ? await collection.handle.requestPermission({ mode: 'read' }) : await collection.handle.queryPermission({ mode: 'read' });
    if (token !== operation) return;
    if (permission !== 'granted') { errorKey = 'permission'; return; }
    const next = await loadSource(collection.handle); const nextDocs = await documents(next);
    if (token !== operation) return;
    snapshot = next; docs = nextDocs; checkedAt = new Date();
    if (!route().has('doc')) {
      const start = startDocument(docs);
      if (start) history.replaceState({}, '', documentURL(collection.id, start.path, location.hash.slice(1)));
    }
  } catch (error) { if (token === operation) errorKey = sourceError(error); }
  finally { if (token === operation) { busy = false; renderShell(); } }
}
function sourceError(error: unknown): Key {
  if (error instanceof SourceError) return error.key;
  if (error instanceof DOMException && ['NotAllowedError', 'SecurityError'].includes(error.name)) return 'permission';
  if (error instanceof DOMException && error.name === 'NotFoundError') return 'missingSource';
  return 'error';
}
async function register(handle: FileSystemDirectoryHandle | FileSystemFileHandle, replacement?: string) {
  let previous = replacement ? collections.find(c => c.id === replacement) : undefined;
  if (!replacement) {
    for (const item of collections) { try { if (await item.handle.isSameEntry(handle)) { previous = item; break; } } catch { /* Unavailable entries can still be reconnected explicitly. */ } }
  }
  const collection: Collection = { id: replacement || previous?.id || crypto.randomUUID(), name: handle.name, kind: handle.kind, handle };
  collections = collections.filter(c => c.id !== collection.id); collections.push(collection);
  let storageFailed = false;
  try { await saveCollection(collection); } catch { storageFailed = true; }
  const replacing = collection.id === route().get('collection');
  history[replacing ? 'replaceState' : 'pushState']({}, '', documentURL(collection.id, replacing ? path() : '', replacing ? location.hash.slice(1) : ''));
  // A relink must reread even when its ID is unchanged.
  snapshot = undefined; docs = []; await activate(collection);
  if (storageFailed) notify(t('storageError'));
}
async function pick(kind: 'directory' | 'file', replacement?: string) {
  try {
    const handle = kind === 'directory' ? await window.showDirectoryPicker({ mode: 'read', id: 'studyhall-folders' })
      : (await window.showOpenFilePicker({ id: 'studyhall-zips', multiple: false, types: [{ description: 'ZIP', accept: { 'application/zip': ['.zip'] } }] }))[0];
    if (handle) await register(handle, replacement);
  } catch (error) { if (!(error instanceof DOMException && error.name === 'AbortError')) notify(t(supported ? sourceError(error) : 'supported')); }
}
async function refresh() {
  if (!current || !snapshot || busy) return;
  const collection = current, token = operation;
  busy = true; errorKey = undefined; renderStatus();
  const anchor = [...document.querySelectorAll<HTMLElement>('#article [data-anchor]')].filter(el => el.getBoundingClientRect().top <= 130).pop();
  const anchorId = anchor?.dataset.anchor; const offset = anchor?.getBoundingClientRect().top; const y = window.scrollY;
  try {
    if (collection.kind === 'file') {
      const file = await (collection.handle as FileSystemFileHandle).getFile();
      if (`${file.lastModified}:${file.size}` === snapshot.stamp) { checkedAt = new Date(); return; }
    }
    const next = await loadSource(collection.handle);
    if (token !== operation) return;
    if (next.stamp !== snapshot.stamp) {
      const nextDocs = await documents(next);
      if (token !== operation) return;
      snapshot = next; docs = nextDocs; renderPage(false);
      const element = anchorId ? anchorElement(anchorId) : undefined;
      if (element) window.scrollTo(0, window.scrollY + element.getBoundingClientRect().top - (offset || 0));
      else window.scrollTo(0, path() && !docs.some(d => d.path === path()) ? 0 : y);
    }
    checkedAt = new Date();
  } catch (error) { if (token === operation) errorKey = sourceError(error); }
  finally { if (token === operation) { busy = false; renderStatus(); } }
}
function search() {
  const query = $('search-input') as HTMLInputElement;
  const matches = searchDocuments(docs, query.value);
  const count = new Intl.NumberFormat(language).format(matches.length);
  $('search-count').textContent = query.value ? t(new Intl.PluralRules(language).select(matches.length) === 'one' ? 'resultOne' : 'resultOther', { count }) : t('emptySearch');
  $('search-results').innerHTML = matches.length ? matches.slice(0, 100).map(doc => {
    const term = query.value.trim().split(/\s+/)[0]?.toLowerCase();
    const position = term ? Math.max(0, doc.text.toLowerCase().indexOf(term) - 40) : 0;
    const excerpt = doc.text.slice(position, position + 140).replace(/[#*`]/g, '').replace(/\s+/g, ' ');
    return `<a data-doc="${esc(doc.path)}" href="${esc(documentURL(current!.id, doc.path))}"><strong>${esc(doc.title)}</strong><small>${esc(doc.path)}</small><p>${esc(excerpt)}</p></a>`;
  }).join('') : `<p>${esc(t('noResults'))}</p>`;
}
function openSearch() {
  if (!docs.length) return;
  const dialog = $('search-dialog') as HTMLDialogElement;
  if (dialog.open) return;
  ($('search-input') as HTMLInputElement).value = ''; search(); dialog.showModal(); $('search-input').focus();
}
app.addEventListener('click', event => {
  const target = event.target as Element;
  const open = target.closest<HTMLElement>('[data-open]');
  if (open) { void pick(open.dataset.open as 'directory' | 'file', !current && route().get('collection') || undefined); return; }
  const recent = target.closest<HTMLElement>('[data-collection]');
  if (recent) { const item = collections.find(c => c.id === recent.dataset.collection); if (item) { history.pushState({}, '', documentURL(item.id, '')); void activate(item); } return; }
  const action = target.closest<HTMLElement>('[data-action]')?.dataset.action;
  if (action) { void handleAction(action); return; }
  const link = target.closest<HTMLAnchorElement>('a'); if (!link) return;
  if (link.dataset.linkError) { event.preventDefault(); notify(t(link.dataset.linkError as Key, { path: link.dataset.original || '' })); return; }
  if ((event as MouseEvent).ctrlKey || (event as MouseEvent).metaKey || (event as MouseEvent).shiftKey || (event as MouseEvent).altKey) return;
  if (link.hasAttribute('data-doc')) { event.preventDefault(); ($('search-dialog') as HTMLDialogElement)?.close(); navigate(link.dataset.doc!, link.dataset.hash); }
  else if (link.hasAttribute('data-anchor-link')) { event.preventDefault(); history.pushState({}, '', documentURL(current!.id, path(), link.dataset.anchorLink)); scrollToAnchor(); }
  else if (link.hasAttribute('data-home')) { event.preventDefault(); ++operation; busy = false; current = undefined; snapshot = undefined; docs = []; errorKey = undefined; history.pushState({}, '', '/'); renderShell(); }
});
async function handleAction(action: string) {
  if (action === 'search') openSearch();
  else if (action === 'closeSearch') ($('search-dialog') as HTMLDialogElement).close();
  else if (action === 'refresh') await refresh();
  else if (action === 'authorize' && current) await activate(current, true);
  else if (action === 'reconnect' && current) await pick(current.kind, current.id);
  else if (action === 'forget' && current) {
    try { await removeCollection(current.id); }
    catch { notify(t('storageError')); return; }
    collections = collections.filter(c => c.id !== current!.id); ++operation; busy = false; current = undefined; snapshot = undefined; docs = []; errorKey = undefined;
    history.pushState({}, '', '/'); renderShell();
  } else if (action === 'copy') {
    try { await navigator.clipboard.writeText(location.href); notify(t('copied')); } catch { notify(t('copyFailed')); }
  } else if (action === 'update') updateWorker?.postMessage({ type: 'SKIP_WAITING' });
  else if (action === 'dismissUpdate') $('update-banner').hidden = true;
}
app.addEventListener('input', event => { if ((event.target as HTMLElement).id === 'search-input') search(); });
app.addEventListener('change', event => {
  const select = event.target as HTMLSelectElement;
  if (select.id === 'language') { const y = window.scrollY; setLanguage(select.value as Language); renderShell(); window.scrollTo(0, y); }
  else if (select.id === 'collection') {
    const item = collections.find(c => c.id === select.value);
    if (item) { history.pushState({}, '', documentURL(item.id, '')); void activate(item); }
    else { ++operation; busy = false; current = undefined; snapshot = undefined; docs = []; history.pushState({}, '', '/'); renderShell(); }
  }
});
document.addEventListener('keydown', event => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); openSearch(); } });
let refreshTimer: ReturnType<typeof setTimeout>;
function scheduleRefresh() { if (document.hidden) return; clearTimeout(refreshTimer); refreshTimer = setTimeout(() => void refresh(), 200); }
window.addEventListener('focus', scheduleRefresh);
document.addEventListener('visibilitychange', scheduleRefresh);
window.addEventListener('popstate', () => {
  const id = route().get('collection');
  if (id === current?.id && snapshot) renderPage();
  else { const item = collections.find(c => c.id === id); if (item) void activate(item); else { ++operation; busy = false; current = undefined; snapshot = undefined; docs = []; renderShell(); } }
});
window.addEventListener('hashchange', scrollToAnchor);
document.addEventListener('scrollend', syncSection);
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (snapshot) { const y = window.scrollY; renderPage(false); window.scrollTo(0, y); } });
for (const name of ['online', 'offline']) window.addEventListener(name, () => { const el = document.querySelector('.connection'); if (el) el.textContent = t(navigator.onLine ? 'online' : 'offline'); });
document.addEventListener('dragover', event => { if ([...(event.dataTransfer?.types || [])].includes('Files')) { event.preventDefault(); document.body.classList.add('dragging'); } });
document.addEventListener('dragleave', event => { if (!event.relatedTarget) document.body.classList.remove('dragging'); });
document.addEventListener('drop', event => {
  event.preventDefault(); document.body.classList.remove('dragging');
  // Capture the promise synchronously: the browser expires drop access after the event.
  const item = [...(event.dataTransfer?.items || [])].find(i => i.kind === 'file');
  const promise = (item as DataTransferItem & { getAsFileSystemHandle?: () => Promise<FileSystemDirectoryHandle | FileSystemFileHandle | null> })?.getAsFileSystemHandle?.();
  if (!promise) { notify(t('dropUnsupported')); return; }
  void promise.then(handle => handle ? register(handle as FileSystemDirectoryHandle | FileSystemFileHandle, !current && route().get('collection') || undefined) : notify(t('dropUnsupported'))).catch(() => notify(t('dropUnsupported')));
});
async function serviceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    const waiting = () => { if (registration.waiting && navigator.serviceWorker.controller) { updateWorker = registration.waiting; renderShell(); } };
    waiting(); registration.addEventListener('updatefound', () => registration.installing?.addEventListener('statechange', () => {
      if (registration.installing?.state === 'installed') { waiting(); if (!navigator.serviceWorker.controller) notify(t('offlineReady')); }
    }));
    let reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (!reloading && updateWorker) { reloading = true; location.reload(); } });
  } catch { /* Local reading still works when offline caching is unavailable. */ }
}
async function boot() {
  try { collections = await getCollections(); } catch { /* Sources can still be opened for this session. */ }
  const item = collections.find(c => c.id === route().get('collection'));
  if (item) await activate(item); else renderShell();
  void serviceWorker();
}
export const ready = boot();
