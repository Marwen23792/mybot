const crypto = require('crypto');
const axios = require('axios');
const Deposit = require('../models/Deposit');
const depositService = require('./depositService');

function isConfigured() {
  return !!(process.env.BINANCE_API_KEY && process.env.BINANCE_SECRET_KEY);
}

function sign(queryString) {
  return crypto.createHmac('sha256', process.env.BINANCE_SECRET_KEY).update(queryString).digest('hex');
}

// Binance Pay P2P transfers don't expose a queryable "Order No.", so we match
// a received USDT payment by expected amount within a short time window —
// same approach used by the main ProdSeller backend.
async function findReceivedPayment({ expectedAmount, sinceTime }) {
  if (!isConfigured()) {
    const err = new Error('Binance Pay non configuré (clés manquantes)');
    err.configMissing = true;
    throw err;
  }

  const timestamp = Date.now();
  const query = `timestamp=${timestamp}&recvWindow=10000`;
  const signature = sign(query);

  const { data } = await axios.get(
    `https://api.binance.com/sapi/v1/pay/transactions?${query}&signature=${signature}`,
    { headers: { 'X-MBX-APIKEY': process.env.BINANCE_API_KEY }, timeout: 15000 }
  );

  const rows = data?.data || [];
  const tolerance = 0.02; // 2% de marge sur les frais réseau/arrondis
  const match = rows.find((row) => {
    const amount = parseFloat(row.amount || row.orderAmount || 0);
    const withinAmount = Math.abs(amount - expectedAmount) <= expectedAmount * tolerance;
    const withinTime = !sinceTime || row.transactionTime >= sinceTime;
    return withinAmount && withinTime;
  });

  return match ? { transactionId: match.transactionId || match.orderId, amount: match.amount } : null;
}

async function pollForReceivedPayment({ expectedAmount, sinceTime }, { retries = 12, intervalMs = 5000 } = {}) {
  for (let i = 0; i < retries; i++) {
    const found = await findReceivedPayment({ expectedAmount, sinceTime });
    if (found) return found;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return null;
}

async function verifyDeposit(depositId) {
  const deposit = await Deposit.findById(depositId);
  if (!deposit) throw new Error('Dépôt introuvable');
  if (deposit.status === 'completed') return deposit;

  const existingTx = await Deposit.findOne({ txId: deposit.txId, status: 'completed' });
  if (deposit.txId && existingTx) {
    throw new Error('Cette transaction a déjà été utilisée');
  }

  if (deposit.method !== 'binance_pay') {
    // Méthode manuelle : reste "pending" pour validation par l'admin dans le dashboard.
    return deposit;
  }

  const sinceTime = deposit.createdAt.getTime() - 5 * 60 * 1000;
  const found = await pollForReceivedPayment({ expectedAmount: deposit.amount, sinceTime });
  if (!found) {
    throw new Error("Paiement introuvable pour l'instant, réessayez dans une minute ou attendez la validation manuelle par l'admin");
  }

  return depositService.applyDeposit(deposit._id, String(found.transactionId));
}

module.exports = { isConfigured, findReceivedPayment, pollForReceivedPayment, verifyDeposit };
