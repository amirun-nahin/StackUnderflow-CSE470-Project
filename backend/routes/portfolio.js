const express = require('express');
const router = express.Router();
const portfolioController = require('../controllers/portfolio');
const { validateToken } = require('../middlewares/AuthMiddleware');

// ---------------------------------------------------------------
// Own portfolio management — registered before /:username below
// so "me" is never mistaken for a username.
// ---------------------------------------------------------------
router.put('/me', validateToken, portfolioController.updateMyPortfolio);
router.post('/me/items', validateToken, portfolioController.addMyItem);
router.delete('/me/items/:itemId', validateToken, portfolioController.removeMyItem);

router.get('/:username', portfolioController.getPortfolioByUsername);
router.get('/:username/pdf', portfolioController.getPortfolioPdf);

module.exports = router;