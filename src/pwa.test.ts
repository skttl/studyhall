import { expect, it } from 'vitest';
import { watchUpdates } from './pwa';
it('notifies when the installing worker moves to waiting before its installed event', () => {
  const worker = Object.assign(new EventTarget(), { state: 'installing' });
  const registration = Object.assign(new EventTarget(), { installing: worker as typeof worker | null, waiting: null as typeof worker | null });
  let ready: unknown;
  watchUpdates(registration as unknown as ServiceWorkerRegistration, () => true, value => ready = value, () => {});
  registration.dispatchEvent(new Event('updatefound'));
  registration.waiting = worker; registration.installing = null; worker.state = 'installed';
  worker.dispatchEvent(new Event('statechange'));
  expect(ready).toBe(worker);
});
