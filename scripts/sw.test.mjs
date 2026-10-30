import { expect, it } from 'vitest';
import vm from 'node:vm';
import { serviceWorkerSource } from './sw-template.mjs';
it('serves bookmarked document routes offline without caching document requests', async () => {
  const handlers = new Map(); const seen = [];
  const cache = { addAll: async files => seen.push(...files), match: async key => key === '/index.html' ? new Response('offline reader') : undefined };
  const self = { location: { origin: 'https://studyhall.skttl.dev' }, clients: { claim: async () => {} }, addEventListener: (name, callback) => handlers.set(name, callback), skipWaiting: async () => {} };
  vm.runInNewContext(serviceWorkerSource(['/index.html', '/assets/app.js'], 'v1'), { self, caches: { open: async () => cache, keys: async () => [], delete: async () => {} }, URL, fetch: async () => { throw Error('offline'); } });
  let installing; handlers.get('install')({ waitUntil: p => installing = p }); await installing;
  expect(seen).toEqual(['/index.html', '/assets/app.js']);
  let response;
  handlers.get('fetch')({ request: { url: 'https://studyhall.skttl.dev/?collection=abc&doc=guide.md', method: 'GET', mode: 'navigate' }, respondWith: p => response = p });
  expect(await (await response).text()).toBe('offline reader');
  let intercepted = false;
  handlers.get('fetch')({ request: { url: 'https://example.com/private.png', method: 'GET' }, respondWith: () => intercepted = true });
  handlers.get('fetch')({ request: { url: 'https://studyhall.skttl.dev/private.md', method: 'GET' }, respondWith: () => intercepted = true });
  expect(intercepted).toBe(false);
});
it('activates an update only after an explicit message and only removes StudyHall caches', async () => {
  const handlers = new Map(); const deleted = []; let activated = false;
  vm.runInNewContext(serviceWorkerSource(['/index.html'], 'v2'), {
    self: { location: { origin: 'https://studyhall.skttl.dev' }, clients: { claim: async () => {} }, addEventListener: (name, fn) => handlers.set(name, fn), skipWaiting: () => activated = true },
    caches: { keys: async () => ['studyhall-app-v1', 'studyhall-app-v2', 'other-app'], delete: async name => deleted.push(name) }, URL,
  });
  expect(activated).toBe(false);
  handlers.get('message')({ data: { type: 'SKIP_WAITING' } }); expect(activated).toBe(true);
  let done; handlers.get('activate')({ waitUntil: p => done = p }); await done;
  expect(deleted).toEqual(['studyhall-app-v1']);
});
