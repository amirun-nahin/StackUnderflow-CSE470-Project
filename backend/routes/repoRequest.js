const express = require('express');
const router = express.Router();
const repoRequestController = require('../controllers/repoRequest');
const { validateToken } = require('../middlewares/AuthMiddleware');

router.post('/:postId/join', validateToken, repoRequestController.joinRepoRequest);
router.delete('/:postId/join', validateToken, repoRequestController.leaveRepoRequest);

module.exports = router;