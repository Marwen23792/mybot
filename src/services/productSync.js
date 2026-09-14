const Product = require('../models/Product');
const prodsellerApi = require('./prodsellerApi');

// Le nombre exact d'unités disponibles n'est renvoyé que par la fiche produit
// individuelle de ProdSeller (pas par la liste), et seulement pour les
// produits à livraison "instant" (clés en stock). On l'interroge une fois par
// produit ici plutôt qu'à chaque consultation du bot par un client.
async function fetchStockCount(p) {
  if (p.delivery?.type !== 'instant') return null;
  try {
    const detail = await prodsellerApi.getProduct(p.id);
    return typeof detail.stock === 'number' ? detail.stock : null;
  } catch {
    return null;
  }
}

async function syncProducts() {
  const upstreamProducts = await prodsellerApi.listProducts();

  for (const p of upstreamProducts) {
    const stockCount = await fetchStockCount(p);
    const update = {
      $set: {
        name: p.name,
        description: p.description || '',
        imageUrl: p.imageUrl || '',
        costPrice: p.price,
        deliveryType: p.delivery?.type || 'instant',
        inStock: !!p.inStock,
        stockCount,
        lastSyncedAt: new Date(),
      },
    };

    const existing = await Product.findOne({ upstreamId: p.id }, 'marginPercent');
    if (existing && existing.marginPercent != null) {
      // Un pourcentage de marge est défini par l'admin : le prix de revente doit
      // suivre proportionnellement le nouveau prix de revient.
      update.$set.resalePrice = Math.round(p.price * (1 + existing.marginPercent / 100) * 100) / 100;
    } else {
      // Pas de marge en %: ne fixer le prix de revente qu'à la création — jamais
      // écraser un prix fixe déjà défini par l'admin.
      update.$setOnInsert = { resalePrice: p.price };
    }

    await Product.updateOne({ upstreamId: p.id }, update, { upsert: true });
  }

  return upstreamProducts.length;
}

function startProductSync(intervalMs = 5 * 60 * 1000) {
  const run = async () => {
    try {
      const count = await syncProducts();
      console.log(`[productSync] ${count} produits synchronisés depuis ProdSeller`);
    } catch (err) {
      if (err.configMissing) {
        console.warn('[productSync] désactivé:', err.message);
      } else {
        console.error('[productSync] échec:', err.message);
      }
    }
  };

  run();
  setInterval(run, intervalMs);
}

module.exports = { syncProducts, startProductSync };
