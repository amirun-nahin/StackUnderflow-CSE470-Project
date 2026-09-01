const express = require('express');
const router = express.Router();
const searchController = require('../controllers/search');
const { validateToken } = require('../middlewares/AuthMiddleware');

router.get('/', validateToken, searchController.search);

module.exports = router;