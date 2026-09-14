(async () => {
  const renderVersionBadge = () => {
    const version = window.showApp?.version || 'dev';
    document.title = `Show de Prêmios v${version}`;
    if (document.querySelector('#app-version-badge')) return;
    const badge = document.createElement('div');
    badge.id = 'app-version-badge';
    badge.textContent = `v${version}`;
    badge.title = 'Versão atual do Show de Prêmios';
    badge.style.cssText = 'position:fixed;right:12px;bottom:10px;z-index:99999;background:#111827;color:#fff;padding:5px 9px;border-radius:999px;font:700 11px/1.2 Arial,sans-serif;box-shadow:0 2px 8px #0004;opacity:.88;pointer-events:none';
    document.body.appendChild(badge);
  };

  const load = src => new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Falha ao carregar ${src}`));
    document.head.appendChild(script);
  });

  renderVersionBadge();

  try {
    await load('renderer-core.js');
    await load('renderer-logic.js');
    await load('renderer-fixes.js');
    await load('renderer-events.js');
  } catch (error) {
    console.error(error);
    const toast = document.querySelector('#toast');
    if (toast) { toast.textContent = 'Falha ao iniciar o aplicativo. Verifique a instalação.'; toast.classList.add('show'); }
  }
})();
