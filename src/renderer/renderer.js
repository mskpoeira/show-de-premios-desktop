(async () => {
  const load = src => new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Falha ao carregar ${src}`));
    document.head.appendChild(script);
  });
  try {
    await load('renderer-core.js');
    await load('renderer-logic.js');
    await load('renderer-events.js');
  } catch (error) {
    console.error(error);
    const toast = document.querySelector('#toast');
    if (toast) { toast.textContent = 'Falha ao iniciar o aplicativo. Verifique a instalação.'; toast.classList.add('show'); }
  }
})();
