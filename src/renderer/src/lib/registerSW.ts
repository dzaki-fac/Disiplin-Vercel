/**
 * Lightweight Service Worker registration with update toast.
 * No deps. Works on localhost + https.
 */
export function registerSW(): void {
  if (!('serviceWorker' in navigator)) return;

  // SW butuh secure context (https) kecuali localhost. Untuk IP lokal (192.168.x.x) via http,
  // browser akan blok SW — app tetap jalan, cuma offline/PWA install tidak aktif.
  const isLocalhost = Boolean(
    window.location.hostname === 'localhost' ||
      window.location.hostname === '[::1]' ||
      window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/)
  );
  const isPrivateNet = Boolean(
    window.location.hostname.match(/^192\.168\.\d+\.\d+$/) ||
      window.location.hostname.match(/^10\.\d+\.\d+\.\d+$/) ||
      window.location.hostname.match(/^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/)
  );

  if (!window.isSecureContext && !isLocalhost) {
    if (isPrivateNet) {
      console.info(
        '[PWA] Akses via IP lokal (http) — Service Worker butuh HTTPS. App tetap bisa dibuka, tapi offline/install PWA baru aktif kalau buka via https atau localhost. Tip: jalankan via https dengan `vite --host --https` atau pakai tunnel (ngrok/cloudflared).'
      );
    }
    // coba tetap return — browser akan reject register di http non-localhost
    if (window.location.protocol !== 'https:' && !isLocalhost) return;
  }

  window.addEventListener('load', () => {
    const swUrl = '/sw.js';
    navigator.serviceWorker
      .register(swUrl)
      .then((reg) => {
        // check for updates periodically
        setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);

        reg.addEventListener('updatefound', () => {
          const worker = reg.installing;
          if (!worker) return;
          worker.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) {
              showUpdateToast(reg);
            }
          });
        });

        // if already waiting
        if (reg.waiting) showUpdateToast(reg);
      })
      .catch((err) => console.warn('[PWA] SW registration failed:', err));

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  });
}

function showUpdateToast(reg: ServiceWorkerRegistration): void {
  if (document.getElementById('pwa-update-toast')) return;
  const toast = document.createElement('div');
  toast.id = 'pwa-update-toast';
  toast.setAttribute('role', 'status');
  toast.style.cssText =
    'position:fixed;left:50%;bottom:calc(16px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:9999;display:flex;align-items:center;gap:12px;padding:12px 16px;background:#141414;color:#fff;border-radius:8px;box-shadow:0 8px 32px rgba(0,0,0,.24);font-family:Inter,system-ui,sans-serif;font-size:13px;max-width:min(92vw,420px);';
  toast.innerHTML = `<span>Versi baru tersedia</span><button id="pwa-update-btn" style="flex-shrink:0;padding:6px 12px;border-radius:999px;border:none;background:#d43008;color:#fff;font-weight:600;cursor:pointer;font-size:13px;">Muat ulang</button><button id="pwa-dismiss-btn" aria-label="Tutup" style="flex-shrink:0;width:28px;height:28px;display:grid;place-items:center;border:none;background:transparent;color:#fff;cursor:pointer;font-size:16px;line-height:1;">×</button>`;
  document.body.appendChild(toast);
  document.getElementById('pwa-update-btn')?.addEventListener('click', () => {
    reg.waiting?.postMessage('SKIP_WAITING');
  });
  document.getElementById('pwa-dismiss-btn')?.addEventListener('click', () => toast.remove());
  setTimeout(() => {
    // auto dismiss after 12s
    if (document.body.contains(toast)) toast.style.opacity = '0.96';
  }, 12000);
}

// Optional: prompt for PWA install (beforeinstallprompt)
export function setupInstallPrompt(): void {
  let deferred: Event & { prompt: () => Promise<void> } | null = null;
  const btnId = 'pwa-install-btn';

  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    deferred = e as typeof deferred;
    // show install button if not already installed
    const existing = document.getElementById(btnId);
    if (existing) return;
    // Create floating install CTA only on mobile-ish or if not standalone
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      // iOS
      // @ts-ignore
      window.navigator.standalone === true;
    if (isStandalone) return;

    const btn = document.createElement('button');
    btn.id = btnId;
    btn.type = 'button';
    btn.textContent = 'Install aplikasi';
    btn.style.cssText =
      'position:fixed;right:16px;bottom:calc(88px + env(safe-area-inset-bottom,0px));z-index:9998;display:inline-flex;align-items:center;gap:8px;padding:10px 14px;background:#fff;color:#141414;border:1px solid #e5e5e5;border-radius:999px;box-shadow:0 4px 20px rgba(0,0,0,.08);font-family:Inter,system-ui,sans-serif;font-size:13px;font-weight:600;cursor:pointer;';
    btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/><path d="M5 19h14"/></svg> Install`;
    btn.addEventListener('click', async () => {
      if (!deferred) return;
      deferred.prompt();
      try {
        await deferred.prompt();
      } catch {}
      deferred = null;
      btn.remove();
    });
    document.body.appendChild(btn);
    setTimeout(() => {
      if (document.body.contains(btn)) btn.remove();
    }, 30000);
  });

  window.addEventListener('appinstalled', () => {
    deferred = null;
    document.getElementById(btnId)?.remove();
    console.log('[PWA] installed');
  });
}
