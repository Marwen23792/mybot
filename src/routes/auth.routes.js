const express = require('express');
const { login, me } = require('../controllers/authController');
const { jwtAuth } = require('../middlewares/jwtAuth');

const router = express.Router();

router.post('/login', login);
router.get('/me', jwtAuth, me);

module.exports = router;
