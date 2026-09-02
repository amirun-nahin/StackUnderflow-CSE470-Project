const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notifications');
const { validateToken } = require('../middlewares/AuthMiddleware');

router.get('/', validateToken, notificationController.getNotifications);
router.put('/:notificationId/read', validateToken, notificationController.markNotificationRead);

module.exports = router;