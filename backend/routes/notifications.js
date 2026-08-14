const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { validateToken } = require('../middlewares/AuthMiddleware');

// List my notifications, newest first
router.get('/', validateToken, async (req, res) => {
    try {
        const notifications = await Notification.findAll({
            where: { UserId: req.user.id },
            order: [['createdAt', 'DESC']]
        });
        res.json(notifications);
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

// Mark one as read
router.put('/:notificationId/read', validateToken, async (req, res) => {
    try {
        const notification = await Notification.findByPk(req.params.notificationId);
        if (!notification) {
            return res.status(404).json({ error: 'Notification not found' });
        }
        if (notification.UserId !== req.user.id) {
            return res.status(403).json({ error: 'Not your notification' });
        }
        notification.is_read = true;
        await notification.save();
        res.json(notification);
    } catch (error) {
        console.error('Error marking notification read:', error);
        res.status(500).json({ error: 'Failed to update notification' });
    }
});

module.exports = router;
