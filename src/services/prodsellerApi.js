const axios = require('axios');

function client() {
  const baseURL = process.env.PRODSELLER_API_BASE_URL;
  const apiKey = process.env.PRODSELLER_API_KEY;
  if (!baseURL || !apiKey) {
    const err = new Error('PRODSELLER_API_KEY / PRODSELLER_API_BASE_URL non configurés dans .env');
    err.configMissing = true;
    throw err;
  }
  return axios.create({
    baseURL,
    timeout: 15000,
    headers: { 'X-API-Key': apiKey },
  });
}

function unwrap(err) {
  if (err.configMissing) return err;
  const message = err.response?.data?.error || err.message || 'Erreur API ProdSeller';
  const wrapped = new Error(message);
  wrapped.status = err.response?.status;
  return wrapped;
}

async function listProducts() {
  try {
    const { data } = await client().get('/products');
    return data.products || [];
  } catch (err) {
    throw unwrap(err);
  }
}

async function getBalance() {
  try {
    const { data } = await client().get('/balance');
    return data;
  } catch (err) {
    throw unwrap(err);
  }
}

async function getProduct(upstreamId) {
  try {
    const { data } = await client().get(`/products/${upstreamId}`);
    return data;
  } catch (err) {
    throw unwrap(err);
  }
}

async function createOrder({ productId, quantity, idempotencyKey }) {
  try {
    const { data } = await client().post(
      '/orders',
      { productId, quantity },
      { headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {} }
    );
    return data;
  } catch (err) {
    throw unwrap(err);
  }
}

async function getOrder(upstreamOrderId) {
  try {
    const { data } = await client().get(`/orders/${upstreamOrderId}`);
    return data;
  } catch (err) {
    throw unwrap(err);
  }
}

module.exports = { listProducts, getBalance, getProduct, createOrder, getOrder };
