async function loadAccueil() {
  const el = document.getElementById('panel-accueil-body');
  try {
    const stats = await apiFetch('/dashboard/stats');

    el.innerHTML = `
      <div class="stat-grid">
        <div class="stat-card"><div class="label">Solde ProdSeller</div><div class="value ${stats.prodsellerBalance === null ? 'muted' : 'blue'}">${stats.prodsellerBalance === null ? 'Non configuré' : fmtMoney(stats.prodsellerBalance)}</div></div>
        <div class="stat-card"><div class="label">Revenu total</div><div class="value green">${fmtMoney(stats.totalRevenue)}</div></div>
        <div class="stat-card"><div class="label">Profit total</div><div class="value green">${fmtMoney(stats.totalProfit)}</div></div>
        <div class="stat-card"><div class="label">Commandes</div><div class="value">${stats.totalOrders} <span class="muted" style="font-size:.9rem">(${stats.ordersToday} aujourd'hui)</span></div></div>
        <div class="stat-card"><div class="label">Clients</div><div class="value">${stats.totalCustomers}</div></div>
        <div class="stat-card"><div class="label">Dépôts en attente</div><div class="value orange">${stats.pendingDeposits}</div></div>
      </div>

      <div class="card">
        <div class="card-header"><h2>Dernières commandes</h2></div>
        <table>
          <thead><tr><th>Client</th><th>Produit</th><th>Montant</th><th>Statut</th><th>Date</th></tr></thead>
          <tbody>
            ${stats.recentOrders.length === 0 ? emptyRow(5) : stats.recentOrders.map((o) => `
              <tr>
                <td>${o.customer}</td>
                <td>${o.productName}</td>
                <td>${fmtMoney(o.amount)}</td>
                <td>${pillHtml(o.status)}</td>
                <td class="muted">${fmtDate(o.createdAt)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (err) {
    el.innerHTML = `<p class="muted">Erreur : ${err.message}</p>`;
  }
}

function emptyRow(cols) {
  return `<tr class="empty-row"><td colspan="${cols}">Aucune donnée</td></tr>`;
}
