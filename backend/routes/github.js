const express = require('express');
const router = express.Router();
const githubController = require('../controllers/github');
const { validateToken } = require('../middlewares/AuthMiddleware');

router.get('/status', validateToken, githubController.getStatus);
router.post('/connect', validateToken, githubController.connect);
router.delete('/disconnect', validateToken, githubController.disconnect);
router.get('/repositories', validateToken, githubController.getRepositories);

module.exports = router;