const express = require('express');
const {
  adminListOrders,
  adminListProducts,
  adminUpdateProductPrice,
  adminApplyBulkMargin,
} = require('../controllers/orderController');

const router = express.Router();

router.get('/', adminListOrders);
router.get('/products', adminListProducts);
router.patch('/products/bulk-margin', adminApplyBulkMargin);
router.patch('/products/:id', adminUpdateProductPrice);

module.exports = router;
