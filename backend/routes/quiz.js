const express = require('express');
const router = express.Router();
const quizController = require('../controllers/quiz');
const { validateToken } = require('../middlewares/AuthMiddleware');

router.get('/', validateToken, quizController.getTodayQuiz);
router.post('/submit', validateToken, quizController.submitScore);

module.exports = router;