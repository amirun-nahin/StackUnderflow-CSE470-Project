const express = require('express');
const router = express.Router();
const aiAssistantController = require('../controllers/Aiassistant');
const { validateToken } = require('../middlewares/AuthMiddleware');

router.post('/ask', validateToken, aiAssistantController.ask);

module.exports = router;