let customersPage = 1;
let customersSearch = '';

async function loadCustomers(page = 1) {
  customersPage = page;
  const el = document.getElementById('customers-tbody');
  try {
    const qs = new URLSearchParams({ page, limit: 20 });
    if (customersSearch) qs.set('search', customersSearch);
    const data = await apiFetch(`/customers?${qs}`);

    el.innerHTML = data.customers.length === 0 ? emptyRow(7) : data.customers.map((c) => `
      <tr>
        <td>${c.username ? '@' + c.username : c.firstName || '—'}</td>
        <td class="muted">${c.telegramId}</td>
        <td>${fmtMoney(c.balance)}</td>
        <td class="muted">${fmtMoney(c.totalSpent)}</td>
        <td class="muted">${c.totalOrders}</td>
        <td>${c.isBlocked ? '<span class="pill rejected">bloqué</span>' : '<span class="pill delivered">actif</span>'}</td>
        <td>
          <button class="btn-sm edit" onclick="adjustBalance('${c._id}')">Ajuster solde</button>
          <button class="btn-sm ${c.isBlocked ? 'approve' : 'reject'}" onclick="toggleBlocked('${c._id}', ${!c.isBlocked})">${c.isBlocked ? 'Débloquer' : 'Bloquer'}</button>
        </td>
      </tr>
    `).join('');

    renderPagination('customers-pagination', data.pagination, loadCustomers);
  } catch (err) {
    el.innerHTML = `<tr class="empty-row"><td colspan="7">Erreur : ${err.message}</td></tr>`;
  }
}

function initCustomersPanel() {
  document.getElementById('customers-search').addEventListener('input', debounce((e) => {
    customersSearch = e.target.value;
    loadCustomers(1);
  }, 400));
  loadCustomers(1);
}

async function adjustBalance(id) {
  const raw = prompt('Montant à ajouter (négatif pour retirer), en USDT :');
  if (raw === null) return;
  const amount = parseFloat(raw);
  if (isNaN(amount) || amount === 0) return alert('Montant invalide');
  const reason = prompt('Raison (optionnel) :') || '';
  try {
    await apiFetch(`/customers/${id}/balance`, { method: 'POST', body: JSON.stringify({ amount, reason }) });
    loadCustomers(customersPage);
  } catch (err) {
    alert(err.message);
  }
}

async function toggleBlocked(id, blocked) {
  try {
    await apiFetch(`/customers/${id}/block`, { method: 'POST', body: JSON.stringify({ blocked }) });
    loadCustomers(customersPage);
  } catch (err) {
    alert(err.message);
  }
}

function debounce(fn, delay) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}
