const axios = require('axios');

const BASE_URL = 'https://pay.crypt.bot/api';

function isConfigured() {
  return !!process.env.CRYPTOBOT_API_TOKEN;
}

function client() {
  if (!isConfigured()) {
    const err = new Error('CryptoBot non configuré (CRYPTOBOT_API_TOKEN manquant)');
    err.configMissing = true;
    throw err;
  }
  return axios.create({
    baseURL: BASE_URL,
    timeout: 15000,
    headers: { 'Crypto-Pay-API-Token': process.env.CRYPTOBOT_API_TOKEN },
  });
}

// Doc : https://help.crypt.bot/crypto-pay-api
async function createInvoice({ amount, description, payload }) {
  const { data } = await client().post('/createInvoice', {
    asset: 'USDT',
    amount: String(amount),
    description,
    payload,
    allow_comments: false,
    allow_anonymous: true,
  });
  if (!data.ok) throw new Error(data.error?.name || 'Erreur CryptoBot');
  return data.result;
}

async function getInvoiceStatus(invoiceId) {
  const { data } = await client().get('/getInvoices', { params: { invoice_ids: String(invoiceId) } });
  if (!data.ok) throw new Error(data.error?.name || 'Erreur CryptoBot');
  return data.result?.items?.[0] || null;
}

module.exports = { isConfigured, createInvoice, getInvoiceStatus };
