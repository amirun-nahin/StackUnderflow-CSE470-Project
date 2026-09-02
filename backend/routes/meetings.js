const express = require('express');
const router = express.Router();
const meetingController = require('../controllers/meetings');
const { validateToken } = require('../middlewares/AuthMiddleware');

router.get('/:groupId/meetings', validateToken, meetingController.getMeetings);
router.post('/:groupId/meetings', validateToken, meetingController.scheduleMeeting);

module.exports = router;