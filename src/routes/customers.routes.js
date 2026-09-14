const express = require('express');
const {
  adminListCustomers,
  adminGetCustomer,
  adminAdjustBalance,
  adminSetBlocked,
} = require('../controllers/customerController');

const router = express.Router();

router.get('/', adminListCustomers);
router.get('/:id', adminGetCustomer);
router.post('/:id/balance', adminAdjustBalance);
router.post('/:id/block', adminSetBlocked);

module.exports = router;
