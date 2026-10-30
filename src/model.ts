import { parseContent, metadataText } from './content';
export interface Snapshot { files: Map<string, File>; stamp: string }
export interface Collection { id: string; name: string; kind: 'directory' | 'file'; handle: FileSystemDirectoryHandle | FileSystemFileHandle }
export interface Doc { path: string; title: string; text: string; metadata?: Record<string, unknown> }
export type LocalTarget = { kind: 'local'; path: string; hash: string } | { kind: 'external'; url: string } | { kind: 'outside' | 'blocked' };
export const order = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });
export const isMarkdown = (path: string) => /\.(md|markdown)$/i.test(path);

export function resolveLocal(from: string, href: string): LocalTarget {
  href = href.trim();
  if (/^(https?:|mailto:)/i.test(href)) return { kind: 'external', url: href };
  if (href.startsWith('//')) return { kind: 'external', url: 'https:' + href };
  if (/^[a-z][a-z\d+.-]*:/i.test(href) || /[\u0000-\u001f\\]/.test(href)) return { kind: 'blocked' };
  try {
    const [withoutHash, fragment = ''] = href.split('#', 2);
    const rawPath = decodeURIComponent(withoutHash.split('?')[0]);
    if (/[\u0000-\u001f\\]/.test(rawPath)) return { kind: 'blocked' };
    const parts = rawPath.startsWith('/') ? [] : from.split('/').slice(0, -1);
    if (!rawPath) return { kind: 'local', path: from, hash: decodeURIComponent(fragment) };
    for (const part of rawPath.split('/')) {
      if (!part || part === '.') continue;
      if (part === '..') { if (!parts.length) return { kind: 'outside' }; parts.pop(); }
      else parts.push(part);
    }
    return { kind: 'local', path: parts.join('/'), hash: decodeURIComponent(fragment) };
  } catch { return { kind: 'blocked' }; }
}

export async function documents(snapshot: Snapshot): Promise<Doc[]> {
  const docs = await Promise.all([...snapshot.files].filter(([path]) => isMarkdown(path)).map(async ([path, file]) => {
    const text = await file.text();
    const content = parseContent(text);
    const heading = content.body.match(/^ {0,3}#\s+(.+?)\s*#*\s*$/m)?.[1];
    return { path, text, metadata: content.metadata, title: metadataText(content.metadata, 'title') || heading?.replace(/!?(?:\[([^\]]+)\])\([^)]*\)/g, '$1').replace(/[*_`]/g, '') || path.split('/').pop()!.replace(/\.(md|markdown)$/i, '') };
  }));
  return docs.sort((a, b) => Number(!a.path.includes('/')) - Number(!b.path.includes('/')) || order.compare(a.path, b.path) || a.path.localeCompare(b.path));
}
export function startDocument(docs: Doc[]): Doc | undefined {
  return docs.find(d => /^readme\.md$/i.test(d.path)) || docs.find(d => /^index\.md$/i.test(d.path));
}
export function findDocument(docs: Doc[], path: string): Doc | undefined {
  if (!path) return startDocument(docs);
  const direct = docs.find(d => d.path === path);
  if (direct) return direct;
  const base = path.replace(/\/$/, '');
  const folder = docs.find(d => d.path.startsWith(base + '/') && /^readme\.md$/i.test(d.path.slice(base.length + 1)))
    || docs.find(d => d.path.startsWith(base + '/') && /^index\.md$/i.test(d.path.slice(base.length + 1)));
  if (folder) return folder;
  const matches = !base.split('/').pop()!.includes('.') ? docs.filter(d => d.path === base + '.md' || d.path === base + '.markdown') : [];
  return matches.length === 1 ? matches[0] : undefined;
}
export function documentURL(collection: string, path: string, hash = ''): string {
  const url = new URL(location.href);
  url.search = '';
  url.searchParams.set('collection', collection);
  if (path) url.searchParams.set('doc', path);
  url.hash = hash ? '#' + encodeURIComponent(hash) : '';
  return url.pathname + url.search + url.hash;
}
export function searchDocuments(docs: Doc[], query: string): Doc[] {
  const terms = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  return docs.filter(d => terms.every(term => `${d.title}\n${d.path}\n${d.text}`.toLocaleLowerCase().includes(term)));
}
