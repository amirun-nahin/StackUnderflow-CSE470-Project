const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const Message = require('../models/Message');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { validateToken } = require('../middlewares/AuthMiddleware');

// Get Followers + Following (Used only for starting a New chat)
router.get('/followers', validateToken, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            include: [
                { model: User, as: 'Followers', attributes: ['id', 'username', 'profile_picture'] },
                { model: User, as: 'Following', attributes: ['id', 'username', 'profile_picture'] }
            ]
        });
        const map = new Map();
        [...(user.Followers || []), ...(user.Following || [])].forEach(u => map.set(u.id, u));
        res.json(Array.from(map.values()));
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch connections' });
    }
});

// Get Active Conversations
router.get('/conversations', validateToken, async (req, res) => {
    try {
        const myId = req.user.id;
        // Fetch all messages involving the user
        const messages = await Message.findAll({
            where: {
                [Op.or]: [{ SenderId: myId }, { ReceiverId: myId }]
            },
            include: [
                { model: User, as: 'Sender', attributes: ['id', 'username'] },
                { model: User, as: 'Receiver', attributes: ['id', 'username'] }
            ],
            order: [['createdAt', 'DESC']]
        });

        // Filter down to unique users
        const uniqueUsers = new Map();
        messages.forEach(msg => {
            const otherUser = msg.SenderId === myId ? msg.Receiver : msg.Sender;
            if (otherUser && !uniqueUsers.has(otherUser.id)) {
                uniqueUsers.set(otherUser.id, otherUser);
            }
        });

        res.json(Array.from(uniqueUsers.values()));
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch conversations' });
    }
});

// Get Unread Chats
router.get('/unread', validateToken, async (req, res) => {
    try {
        const unread = await Message.findAll({
            where: { ReceiverId: req.user.id, is_read: false },
            include: [{ model: User, as: 'Sender', attributes: ['id', 'username'] }],
            order: [['createdAt', 'DESC']]
        });

        const uniqueSenders = [];
        const seenIds = new Set();
        unread.forEach(msg => {
            if (!seenIds.has(msg.SenderId)) {
                seenIds.add(msg.SenderId);
                uniqueSenders.push(msg.Sender);
            }
        });
        res.json(uniqueSenders);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch unread chats' });
    }
});

// Get Chat History (and mark as read)
router.get('/:userId', validateToken, async (req, res) => {
    try {
        const myId = req.user.id;
        const otherId = parseInt(req.params.userId);

        await Message.update({ is_read: true }, {
            where: { SenderId: otherId, ReceiverId: myId, is_read: false }
        });

        const messages = await Message.findAll({
            where: {
                [Op.or]: [
                    { SenderId: myId, ReceiverId: otherId },
                    { SenderId: otherId, ReceiverId: myId }
                ]
            },
            order: [['createdAt', 'ASC']]
        });
        res.json(messages);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch chat history' });
    }
});

// Send a Message
router.post('/:userId', validateToken, async (req, res) => {
    try {
        const message = await Message.create({
            text_content: req.body.text_content,
            SenderId: req.user.id,
            ReceiverId: req.params.userId
        });

        const sender = await User.findByPk(req.user.id);
        await Notification.create({
            type: 'NEW_MESSAGE',
            message: `${sender.username} sent you a message.`,
            link: `/chat?userId=${req.user.id}`,
            UserId: req.params.userId
        });
        
        res.json(message);
    } catch (error) {
        res.status(500).json({ error: 'Failed to send message' });
    }
});

module.exports = router;