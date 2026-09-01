const express = require('express');
const router = express.Router();
const milestoneController = require('../controllers/milestones');
const { validateToken } = require('../middlewares/AuthMiddleware');

router.get('/', validateToken, milestoneController.getMilestones);

module.exports = router;