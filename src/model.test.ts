import { describe, expect, it } from 'vitest';
import { documents, resolveLocal, startDocument, findDocument } from './model';

describe('document navigation', () => {
  it('resolves encoded Unicode paths relative to the current document', () => {
    expect(resolveLocal('guides/start.md', '../billeder/%C3%B8%20foto.png')).toEqual({ kind: 'local', path: 'billeder/ø foto.png', hash: '' });
    expect(resolveLocal('guides/start.md', '#hello')).toEqual({ kind: 'local', path: 'guides/start.md', hash: 'hello' });
    expect(resolveLocal('guides/start.md', '/README.md#intro')).toEqual({ kind: 'local', path: 'README.md', hash: 'intro' });
  });
  it('rejects encoded traversal and executable schemes', () => {
    expect(resolveLocal('a.md', '%2e%2e/private.md').kind).toBe('outside');
    expect(resolveLocal('a.md', 'javascript:alert(1)').kind).toBe('blocked');
    expect(resolveLocal('a.md', 'file:///private').kind).toBe('blocked');
    expect(resolveLocal('a.md', 'https://example.com').kind).toBe('external');
  });
  it('chooses README before index and sorts nested files naturally', async () => {
    const files = new Map([
      ['index.md', new File(['# Index'], 'index.md')], ['README.md', new File(['# Welcome'], 'README.md')],
      ['guides/10.md', new File(['# Ten'], '10.md')], ['guides/2.md', new File(['No heading'], '2.md')],
      ['image.png', new File(['x'], 'image.png')],
    ]);
    const docs = await documents({ files, stamp: 'x' });
    expect(docs.map(d => d.path)).toEqual(['guides/2.md', 'guides/10.md', 'index.md', 'README.md']);
    expect(docs.find(d => d.path === 'README.md')?.title).toBe('Welcome');
    expect(docs.find(d => d.path === 'guides/2.md')?.title).toBe('2');
    expect(startDocument(docs)?.path).toBe('README.md');
    expect(findDocument(docs, 'guides/')).toBeUndefined();
  });
});
