const express = require('express');
const router = express.Router();
const duelController = require('../controllers/duel');
const { validateToken } = require('../middlewares/AuthMiddleware');

router.post('/invite', validateToken, duelController.sendInvite);
router.post('/:duelId/respond', validateToken, duelController.respondToInvite);
router.get('/mine', validateToken, duelController.getMyDuels);
router.get('/invites/pending', validateToken, duelController.getPendingInvites);
router.get('/:duelId/state', validateToken, duelController.getDuelState);
router.post('/:duelId/answer', validateToken, duelController.submitAnswer);

module.exports = router;
module.exports.sweepExpiredDuels = duelController.sweepExpiredDuels;