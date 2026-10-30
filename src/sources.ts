import { BlobReader, ZipReader, ERR_UNSAFE_FILENAME } from '@zip.js/zip.js';
import type { Snapshot } from './model';
export const limits = { compressed: 100 * 1024 * 1024, expanded: 250 * 1024 * 1024, entries: 10000 };
export class SourceError extends Error {
  constructor(public key: 'sourceLimit' | 'unsafeArchive' | 'invalidZip') { super(key); }
}
function archivePath(name: string): string {
  if (!name || name.startsWith('/') || /^[a-z]:/i.test(name) || /[\\\u0000-\u001f]/.test(name)) throw new SourceError('unsafeArchive');
  const parts = name.replace(/\/$/, '').split('/');
  if (parts.length > 101) throw new SourceError('sourceLimit');
  if (parts.some(p => !p || p === '..' || p === '.')) throw new SourceError('unsafeArchive');
  return parts.join('/');
}
export async function loadZip(file: File, budget = limits): Promise<Snapshot> {
  if (file.size > budget.compressed) throw new SourceError('sourceLimit');
  const reader = new ZipReader(new BlobReader(file), { useWebWorkers: false });
  const files = new Map<string, File>();
  const names = new Set<string>();
  let count = 0, expanded = 0;
  try {
    for await (const entry of reader.getEntriesGenerator()) {
      if (++count > budget.entries) throw new SourceError('sourceLimit');
      const path = archivePath(entry.filename);
      if (entry.symlink || entry.encrypted || names.has(path)) throw new SourceError('unsafeArchive');
      names.add(path);
      if (entry.directory) continue;
      if (expanded + entry.uncompressedSize > budget.expanded) throw new SourceError('sourceLimit');
      const chunks: Uint8Array<ArrayBuffer>[] = [];
      await entry.getData(new WritableStream<Uint8Array>({ write(chunk) {
        expanded += chunk.byteLength;
        if (expanded > budget.expanded) throw new SourceError('sourceLimit');
        chunks.push(new Uint8Array(chunk));
      } }), { checkSignature: true });
      files.set(path, new File(chunks, path.split('/').pop()!, { lastModified: entry.lastModDate?.getTime() || 0 }));
    }
    // A shared wrapper directory is presentation only; never write extracted files to disk.
    const prefix = [...files.keys()][0]?.split('/')[0];
    if (prefix && [...files.keys()].every(p => p.startsWith(prefix + '/'))) {
      for (const [path, data] of [...files]) { files.delete(path); files.set(path.slice(prefix.length + 1), data); }
    }
    return { files, stamp: `${file.lastModified}:${file.size}` };
  } catch (error) {
    if (error instanceof SourceError) throw error;
    if (error instanceof Error && error.message === ERR_UNSAFE_FILENAME) throw new SourceError('unsafeArchive');
    throw new SourceError('invalidZip');
  } finally { await reader.close(); }
}
export async function loadSource(handle: FileSystemDirectoryHandle | FileSystemFileHandle): Promise<Snapshot> {
  if (handle.kind === 'file') return loadZip(await handle.getFile());
  const files = new Map<string, File>();
  let total = 0, entries = 0;
  async function walk(directory: FileSystemDirectoryHandle, prefix: string, depth: number) {
    if (depth > 100) throw new SourceError('sourceLimit');
    for await (const child of directory.values()) {
      if (++entries > limits.entries) throw new SourceError('sourceLimit');
      const path = prefix + child.name;
      if (child.kind === 'directory') await walk(child, path + '/', depth + 1);
      else {
        const file = await child.getFile();
        total += file.size;
        if (total > limits.expanded) throw new SourceError('sourceLimit');
        files.set(path, file);
      }
    }
  }
  await walk(handle, '', 0);
  const stamp = [...files].sort(([a], [b]) => a.localeCompare(b)).map(([p, f]) => `${p}:${f.size}:${f.lastModified}`).join('|');
  return { files, stamp };
}
