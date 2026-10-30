import 'fake-indexeddb/auto';
import { expect, it } from 'vitest';
import { getCollections, saveCollection, removeCollection } from './storage';
import type { Collection } from './model';
it('persists collection identity and forgets references without document copies', async () => {
  const record = { id: 'one', name: 'Docs', kind: 'directory', handle: { kind: 'directory', name: 'Docs' } } as Collection;
  await saveCollection(record);
  expect(await getCollections()).toEqual([record]);
  await removeCollection('one');
  expect(await getCollections()).toEqual([]);
});
