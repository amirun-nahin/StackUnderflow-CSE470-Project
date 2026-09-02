const express = require('express');
const router = express.Router();
const competitionController = require('../controllers/competition');
const { validateToken } = require('../middlewares/AuthMiddleware');

router.post('/create', validateToken, competitionController.createCompetition);
router.get('/board', competitionController.getBoard);
router.get('/:competitionId', validateToken, competitionController.getCompetitionDetail);
router.post('/:competitionId/submit', validateToken, competitionController.submitSolution);
router.get('/:competitionId/submissions', validateToken, competitionController.getSubmissions);
router.put('/submission/:submissionId/evaluate', validateToken, competitionController.evaluateSubmission);
router.get('/:competitionId/leaderboard', competitionController.getLeaderboard);
router.get('/:competitionId/my-submission', validateToken, competitionController.getMySubmission);

module.exports = router;