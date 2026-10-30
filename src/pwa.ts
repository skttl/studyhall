export function watchUpdates(registration: ServiceWorkerRegistration, controlled: () => boolean, onUpdate: (worker: ServiceWorker) => void, onOfflineReady: () => void) {
  if (registration.waiting && controlled()) onUpdate(registration.waiting);
  registration.addEventListener('updatefound', () => {
    const worker = registration.installing;
    worker?.addEventListener('statechange', () => {
      if (worker.state !== 'installed') return;
      if (controlled() && registration.waiting) onUpdate(registration.waiting);
      else onOfflineReady();
    });
  });
}
