let ordersPage = 1;
let ordersStatus = '';

async function loadOrders(page = 1) {
  ordersPage = page;
  const el = document.getElementById('orders-tbody');
  try {
    const qs = new URLSearchParams({ page, limit: 20 });
    if (ordersStatus) qs.set('status', ordersStatus);
    const data = await apiFetch(`/orders?${qs}`);

    el.innerHTML = data.orders.length === 0 ? emptyRow(6) : data.orders.map((o) => `
      <tr>
        <td>${o.customer}</td>
        <td>${o.productName}${o.quantity > 1 ? ` ×${o.quantity}` : ''}</td>
        <td>${fmtMoney(o.amount)}</td>
        <td class="muted">${fmtMoney(o.profit)}</td>
        <td>${pillHtml(o.status)}${o.failReason ? `<div class="muted" style="font-size:.72rem;margin-top:3px">${o.failReason}</div>` : ''}</td>
        <td class="muted">${fmtDate(o.createdAt)}</td>
      </tr>
    `).join('');

    renderPagination('orders-pagination', data.pagination, loadOrders);
  } catch (err) {
    el.innerHTML = `<tr class="empty-row"><td colspan="6">Erreur : ${err.message}</td></tr>`;
  }
}

function initOrdersPanel() {
  document.getElementById('orders-status-filter').addEventListener('change', (e) => {
    ordersStatus = e.target.value;
    loadOrders(1);
  });
  loadOrders(1);
  loadProducts();
}

// --- Gestion des produits / marges ---
async function loadProducts() {
  const el = document.getElementById('products-tbody');
  try {
    const data = await apiFetch('/orders/products');
    el.innerHTML = data.products.length === 0
      ? emptyRow(6)
      : data.products.map((p) => `
        <tr>
          <td>${p.name}</td>
          <td class="muted">${fmtMoney(p.costPrice)}</td>
          <td>
            <input type="number" step="0.1" min="0" placeholder="%" value="${p.marginPercent ?? ''}" data-id="${p._id}" class="margin-input" style="width:70px;background:var(--bg);border:1px solid var(--border);color:var(--text);border-radius:6px;padding:5px 8px" />
            <button class="btn-sm edit" onclick="applyProductMargin('${p._id}')">Appliquer</button>
          </td>
          <td><input type="number" step="0.01" value="${p.resalePrice}" data-id="${p._id}" class="resale-input" style="width:90px;background:var(--bg);border:1px solid var(--border);color:var(--text);border-radius:6px;padding:5px 8px" /></td>
          <td>${p.inStock ? '<span class="pill delivered">en stock</span>' : '<span class="pill failed">rupture</span>'}</td>
          <td>${p.active ? '<span class="pill delivered">actif</span>' : '<span class="pill rejected">désactivé</span>'}</td>
          <td>
            <button class="btn-sm edit" onclick="saveProductPrice('${p._id}')">Enregistrer</button>
            <button class="btn-sm ${p.active ? 'reject' : 'approve'}" onclick="toggleProductActive('${p._id}', ${!p.active})">${p.active ? 'Désactiver' : 'Activer'}</button>
          </td>
        </tr>
      `).join('');
  } catch (err) {
    el.innerHTML = `<tr class="empty-row"><td colspan="6">Erreur : ${err.message}</td></tr>`;
  }
}

async function saveProductPrice(id) {
  const input = document.querySelector(`.resale-input[data-id="${id}"]`);
  const resalePrice = parseFloat(input.value);
  if (isNaN(resalePrice) || resalePrice < 0) return alert('Prix invalide');
  try {
    await apiFetch(`/orders/products/${id}`, { method: 'PATCH', body: JSON.stringify({ resalePrice }) });
    loadProducts();
  } catch (err) {
    alert(err.message);
  }
}

async function applyProductMargin(id) {
  const input = document.querySelector(`.margin-input[data-id="${id}"]`);
  const marginPercent = parseFloat(input.value);
  if (isNaN(marginPercent) || marginPercent < 0) return alert('Pourcentage invalide');
  try {
    await apiFetch(`/orders/products/${id}`, { method: 'PATCH', body: JSON.stringify({ marginPercent }) });
    loadProducts();
  } catch (err) {
    alert(err.message);
  }
}

async function toggleProductActive(id, active) {
  try {
    await apiFetch(`/orders/products/${id}`, { method: 'PATCH', body: JSON.stringify({ active }) });
    loadProducts();
  } catch (err) {
    alert(err.message);
  }
}

async function applyBulkMargin() {
  const input = document.getElementById('bulk-margin-pct');
  const percentage = parseFloat(input.value);
  if (isNaN(percentage) || percentage < 0) return alert('Pourcentage invalide');
  if (!confirm(`Appliquer une marge de ${percentage}% sur tous les produits ? Cela écrasera les prix de vente actuels.`)) return;
  try {
    await apiFetch('/orders/products/bulk-margin', { method: 'PATCH', body: JSON.stringify({ percentage }) });
    loadProducts();
  } catch (err) {
    alert(err.message);
  }
}
