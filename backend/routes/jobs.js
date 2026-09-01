const express = require('express');
const router = express.Router();
const jobController = require('../controllers/jobs');
const { validateToken } = require('../middlewares/AuthMiddleware');

router.get('/', validateToken, jobController.getJobs);

module.exports = router;