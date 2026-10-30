import type { Collection } from './model';
function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('studyhall-collections', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('collections', { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('storageError'));
  });
}
async function transaction<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('collections', mode);
    let result: IDBRequest<T>;
    try { result = action(tx.objectStore('collections')); }
    catch (error) { db.close(); reject(error); return; }
    tx.oncomplete = () => { db.close(); resolve(result.result); };
    tx.onerror = tx.onabort = () => { db.close(); reject(tx.error || result.error); };
  });
}
export const getCollections = () => transaction<Collection[]>('readonly', store => store.getAll());
export const saveCollection = (collection: Collection) => transaction('readwrite', store => store.put(collection));
export const removeCollection = (id: string) => transaction('readwrite', store => store.delete(id));
