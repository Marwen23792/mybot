if (!getToken()) {
  window.location.href = 'login.html';
}

const panelLoaders = {
  accueil: loadAccueil,
  orders: initOrdersPanel,
  customers: initCustomersPanel,
  deposits: initDepositsPanel,
};
const loadedPanels = new Set();

function showPanel(name) {
  document.querySelectorAll('.nav-link[data-panel]').forEach((el) => {
    el.classList.toggle('active', el.dataset.panel === name);
  });
  document.querySelectorAll('.panel').forEach((el) => {
    el.classList.toggle('active', el.id === `panel-${name}`);
  });

  if (name === 'accueil' || !loadedPanels.has(name)) {
    panelLoaders[name]?.();
    loadedPanels.add(name);
  }

  window.location.hash = name;
}

function renderPagination(containerId, pagination, loadFn) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const { page, pages, total } = pagination;

  el.innerHTML = `
    <button ${page <= 1 ? 'disabled' : ''} id="${containerId}-prev">← Précédent</button>
    <span class="muted">Page ${page} / ${Math.max(pages, 1)} — ${total} résultats</span>
    <button ${page >= pages ? 'disabled' : ''} id="${containerId}-next">Suivant →</button>
  `;

  document.getElementById(`${containerId}-prev`)?.addEventListener('click', () => loadFn(page - 1));
  document.getElementById(`${containerId}-next`)?.addEventListener('click', () => loadFn(page + 1));
}

document.querySelectorAll('.nav-link[data-panel]').forEach((el) => {
  el.addEventListener('click', () => showPanel(el.dataset.panel));
});

const initialPanel = window.location.hash.replace('#', '') || 'accueil';
showPanel(panelLoaders[initialPanel] ? initialPanel : 'accueil');
