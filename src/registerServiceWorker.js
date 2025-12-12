export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    const serviceWorkerUrl = `${import.meta.env.BASE_URL}service-worker.js`;
    window.addEventListener('load', () => {
      navigator.serviceWorker.register(serviceWorkerUrl).catch((error) => {
        console.error('Service worker registration failed:', error);
      });
    });
  }
}
