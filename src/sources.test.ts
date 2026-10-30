import { describe, expect, it } from 'vitest';
import { BlobWriter, TextReader, ZipWriter } from '@zip.js/zip.js';
import { loadZip, loadSource } from './sources';

async function archive(entries: [string, string, Record<string, unknown>?][]) {
  const writer = new ZipWriter(new BlobWriter(), { useWebWorkers: false });
  for (const [name, text, options] of entries) await writer.add(name, new TextReader(text), options);
  return new File([await writer.close()], 'docs.zip');
}
describe('local sources', () => {
  it('reads a zip and removes a single enclosing folder', async () => {
    const snapshot = await loadZip(await archive([['docs/README.md', '# Hello'], ['docs/img/a.svg', '<svg/>']]));
    expect([...snapshot.files.keys()]).toEqual(['README.md', 'img/a.svg']);
    expect(await snapshot.files.get('README.md')!.text()).toBe('# Hello');
  });
  it('rejects archive paths escaping the source', async () => {
    const zip = await archive([['../private.md', 'secret']]);
    await expect(loadZip(zip)).rejects.toThrow('unsafeArchive');
  });
  it('rejects symlink entries', async () => {
    await expect(loadZip(await archive([['link', '/etc/passwd', { unixMode: 0o120777 }]]))).rejects.toThrow('unsafeArchive');
  });
  it('enforces actual extraction bytes and file counts', async () => {
    const zip = await archive([['README.md', 'a'.repeat(500)], ['two.md', 'b']]);
    await expect(loadZip(zip, { compressed: 10000, expanded: 499, entries: 10 })).rejects.toThrow('sourceLimit');
    await expect(loadZip(zip, { compressed: 10000, expanded: 1000, entries: 1 })).rejects.toThrow('sourceLimit');
    expect((await loadZip(zip, { compressed: 10000, expanded: 501, entries: 2 })).files.size).toBe(2);
    await expect(loadZip(zip, { compressed: 1, expanded: 1000, entries: 2 })).rejects.toThrow('sourceLimit');
  });
  it('detects added and changed directory files without storing content', async () => {
    let file = new File(['# First'], 'README.md', { lastModified: 1 });
    const handle = { kind: 'directory', async *values() { yield { kind: 'file', name: 'README.md', getFile: async () => file }; } };
    const first = await loadSource(handle as FileSystemDirectoryHandle);
    file = new File(['# Second'], 'README.md', { lastModified: 2 });
    const second = await loadSource(handle as FileSystemDirectoryHandle);
    expect(second.stamp).not.toBe(first.stamp);
    expect(await second.files.get('README.md')!.text()).toBe('# Second');
  });
});
