const express = require('express');
const router = express.Router();
const bountyController = require('../controllers/bounty');
const { validateToken } = require('../middlewares/AuthMiddleware');

router.get('/board', bountyController.getBoard);
router.get('/stats', validateToken, bountyController.getStats);
router.post('/:postId/enroll', validateToken, bountyController.enroll);
router.delete('/:postId/enroll', validateToken, bountyController.unenroll);
router.get('/:postId/enrollments', bountyController.getEnrollments);
router.post('/:postId/submit', validateToken, bountyController.submitSolution);
router.get('/:postId/submissions', validateToken, bountyController.getSubmissions);
router.put('/submission/:submissionId/review', validateToken, bountyController.reviewSubmission);

module.exports = router;