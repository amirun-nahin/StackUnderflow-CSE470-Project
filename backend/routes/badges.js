const express = require('express');
const router = express.Router();
const badgeController = require('../controllers/badges');
const { validateToken } = require('../middlewares/AuthMiddleware');

router.get('/:username', badgeController.getUserBadges);
router.put('/pin', validateToken, badgeController.pinBadges);

module.exports = router;