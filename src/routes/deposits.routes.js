const express = require('express');
const {
  adminListDeposits,
  adminApproveDeposit,
  adminRejectDeposit,
  adminListMethods,
  adminUpsertMethod,
} = require('../controllers/depositController');

const router = express.Router();

router.get('/', adminListDeposits);
router.post('/:id/approve', adminApproveDeposit);
router.post('/:id/reject', adminRejectDeposit);
router.get('/methods', adminListMethods);
router.post('/methods', adminUpsertMethod);

module.exports = router;
