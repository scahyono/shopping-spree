export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    const buildNumber = Number(import.meta.env.VITE_BUILD_NUMBER ?? 0);
    const buildQuery = Number.isFinite(buildNumber) && buildNumber > 0 ? `?build=${buildNumber}` : '';
    const serviceWorkerUrl = `${import.meta.env.BASE_URL}service-worker.js${buildQuery}`;

    navigator.serviceWorker
      .register(serviceWorkerUrl)
      .then((registration) => {
        const handleNewWorker = (worker) => {
          if (!worker) return;

          worker.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) {
              worker.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        };

        handleNewWorker(registration.installing);

        registration.addEventListener('updatefound', () => {
          handleNewWorker(registration.installing);
        });

        navigator.serviceWorker.addEventListener('controllerchange', () => {
          window.location.reload();
        });

        registration.update();
      })
      .catch((error) => {
        console.error('Service worker registration failed:', error);
      });
  }
}
