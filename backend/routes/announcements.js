const express = require('express');
const router = express.Router();
const announcementController = require('../controllers/announcements');
const { validateToken } = require('../middlewares/AuthMiddleware');

router.get('/:groupId/announcements', validateToken, announcementController.getAnnouncements);
router.post('/:groupId/announcements', validateToken, announcementController.createAnnouncement);

module.exports = router;