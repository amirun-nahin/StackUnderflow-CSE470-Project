const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chat');
const { validateToken } = require('../middlewares/AuthMiddleware');

router.get('/followers', validateToken, chatController.getFollowersAndFollowing);
router.get('/conversations', validateToken, chatController.getConversations);
router.get('/unread', validateToken, chatController.getUnread);
router.get('/:userId', validateToken, chatController.getChatHistory);
router.post('/:userId', validateToken, chatController.sendMessage);

module.exports = router;