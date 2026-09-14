let depositsPage = 1;
let depositsStatus = 'pending';

async function loadDeposits(page = 1) {
  depositsPage = page;
  const el = document.getElementById('deposits-tbody');
  try {
    const qs = new URLSearchParams({ page, limit: 20 });
    if (depositsStatus) qs.set('status', depositsStatus);
    const data = await apiFetch(`/deposits?${qs}`);

    el.innerHTML = data.deposits.length === 0 ? emptyRow(7) : data.deposits.map((d) => `
      <tr data-deposit-id="${d.id}" data-customer="${escapeAttr(d.customer)}" data-amount="${d.amount}" data-method="${escapeAttr(d.method)}">
        <td>${d.customer}</td>
        <td>${fmtMoney(d.amount)}</td>
        <td class="muted">${d.method}</td>
        <td class="muted">${d.txId || '—'}</td>
        <td>${pillHtml(d.status)}</td>
        <td class="muted" style="font-size:.78rem">${fmtDate(d.createdAt)}</td>
        <td>
          ${d.status === 'pending' || d.status === 'processing' ? `
            <button class="btn-sm approve" onclick="approveDeposit('${d.id}')">Approuver</button>
            <button class="btn-sm reject" onclick="rejectDeposit('${d.id}')">Rejeter</button>
          ` : '—'}
        </td>
      </tr>
    `).join('');

    renderPagination('deposits-pagination', data.pagination, loadDeposits);
  } catch (err) {
    el.innerHTML = `<tr class="empty-row"><td colspan="6">Erreur : ${err.message}</td></tr>`;
  }
}

function initDepositsPanel() {
  document.getElementById('deposits-status-filter').addEventListener('change', (e) => {
    depositsStatus = e.target.value;
    loadDeposits(1);
  });
  loadDeposits(1);
  loadDepositMethods();
}

// --- Méthodes de dépôt (montant minimum, activation) ---
async function loadDepositMethods() {
  const el = document.getElementById('deposit-methods-tbody');
  try {
    const data = await apiFetch('/deposits/methods');
    el.innerHTML = data.methods.length === 0
      ? emptyRow(4)
      : data.methods.map((m) => `
        <tr>
          <td>${m.name}</td>
          <td><input type="number" step="0.01" min="0" value="${m.minAmount}" data-slug="${m.slug}" class="min-amount-input" style="width:100px;background:var(--bg);border:1px solid var(--border);color:var(--text);border-radius:6px;padding:5px 8px" /></td>
          <td>${m.enabled ? '<span class="pill delivered">activée</span>' : '<span class="pill rejected">désactivée</span>'}</td>
          <td>
            <button class="btn-sm edit" onclick="saveDepositMethod('${m.slug}', '${m.name}', ${m.enabled})">Enregistrer</button>
            <button class="btn-sm ${m.enabled ? 'reject' : 'approve'}" onclick="saveDepositMethod('${m.slug}', '${m.name}', ${!m.enabled})">${m.enabled ? 'Désactiver' : 'Activer'}</button>
          </td>
        </tr>
      `).join('');
  } catch (err) {
    el.innerHTML = `<tr class="empty-row"><td colspan="4">Erreur : ${err.message}</td></tr>`;
  }
}

async function saveDepositMethod(slug, name, enabled) {
  const input = document.querySelector(`.min-amount-input[data-slug="${slug}"]`);
  const minAmount = parseFloat(input.value);
  if (isNaN(minAmount) || minAmount < 0) return alert('Montant invalide');
  try {
    await apiFetch('/deposits/methods', { method: 'POST', body: JSON.stringify({ slug, name, minAmount, enabled }) });
    loadDepositMethods();
  } catch (err) {
    alert(err.message);
  }
}

async function createDepositMethod() {
  const slug = document.getElementById('new-method-slug').value.trim();
  const name = document.getElementById('new-method-name').value.trim();
  const minAmount = parseFloat(document.getElementById('new-method-min').value);
  const instructions = document.getElementById('new-method-instructions').value.trim();

  if (!slug || !name) return alert('Slug et nom requis');
  if (isNaN(minAmount) || minAmount < 0) return alert('Montant minimum invalide');

  try {
    await apiFetch('/deposits/methods', {
      method: 'POST',
      body: JSON.stringify({ slug, name, minAmount, instructions, enabled: true }),
    });
    document.getElementById('new-method-slug').value = '';
    document.getElementById('new-method-name').value = '';
    document.getElementById('new-method-min').value = '';
    document.getElementById('new-method-instructions').value = '';
    loadDepositMethods();
  } catch (err) {
    alert(err.message);
  }
}

function escapeAttr(str) {
  return String(str ?? '').replace(/"/g, '&quot;');
}

async function approveDeposit(id) {
  const row = document.querySelector(`tr[data-deposit-id="${id}"]`);
  const { customer, amount, method } = row?.dataset || {};

  const txId = prompt(
    `Approuver le dépôt de $${amount} (${method}) pour ${customer} ?\n\nCollez l'ID de transaction / preuve de paiement si vous en avez un (laissez vide sinon) :`
  );
  if (txId === null) return; // annulé

  try {
    await apiFetch(`/deposits/${id}/approve`, { method: 'POST', body: JSON.stringify({ txId: txId.trim() }) });
    loadDeposits(depositsPage);
  } catch (err) {
    alert(err.message);
  }
}

async function rejectDeposit(id) {
  const row = document.querySelector(`tr[data-deposit-id="${id}"]`);
  const { customer, amount, method } = row?.dataset || {};

  const reason = prompt(`Rejeter le dépôt de $${amount} (${method}) pour ${customer} ?\n\nRaison du rejet (optionnel) :`);
  if (reason === null) return; // annulé

  try {
    await apiFetch(`/deposits/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) });
    loadDeposits(depositsPage);
  } catch (err) {
    alert(err.message);
  }
}
