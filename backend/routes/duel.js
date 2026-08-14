const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const Duel = require('../models/Duel');
const DuelQuestion = require('../models/DuelQuestion');
const DuelSubmission = require('../models/DuelSubmission');
const QuestionBank = require('../models/QuestionBank');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { validateToken } = require('../middlewares/AuthMiddleware');

// =================================================================
// NOTE ON CODE EXECUTION
// This route does NOT execute submitted code. Running arbitrary
// Python/Java/JavaScript safely requires a sandboxed execution
// service (e.g. Piston: https://github.com/engineer-man/piston,
// or Judge0: https://judge0.com/). Wire that call into
// `runTestCases()` below. Until then, submissions are stored as
// PENDING and results can be posted via the /submission/:id/result
// route (either by that service once integrated, or manually).
// =================================================================
async function runTestCases(codeContent, language, testCases) {
    // TODO: replace with a real call to a sandboxed execution service.
    // Expected return shape once implemented:
    // { passed: number, total: number, status: 'PASSED' | 'FAILED' }
    console.warn('runTestCases() is a stub — no execution service is wired up yet.');
    return null;
}

// Recomputes and, if both sides are done, finalizes the duel's winner.
// Winner = higher total test cases passed across all questions;
// tie-break = whoever's last submission timestamp is earlier.
async function tryResolveDuel(duelId) {
    const duel = await Duel.findByPk(duelId, {
        include: [{ model: DuelQuestion }]
    });
    if (!duel || duel.status !== 'ACTIVE') return;

    const duelQuestionIds = duel.DuelQuestions.map(q => q.id);
    if (duelQuestionIds.length === 0) return;

    const submissions = await DuelSubmission.findAll({
        where: { DuelQuestionId: duelQuestionIds }
    });

    // Only resolve once every question has a non-PENDING submission from both sides
    const expectedCount = duelQuestionIds.length * 2; // challenger + opponent
    const resolvedSubmissions = submissions.filter(s => s.status !== 'PENDING');
    if (resolvedSubmissions.length < expectedCount) return;

    const totals = {}; // UserId -> { passed, lastSubmittedAt }
    for (const s of resolvedSubmissions) {
        if (!totals[s.UserId]) totals[s.UserId] = { passed: 0, lastSubmittedAt: s.submitted_at };
        totals[s.UserId].passed += s.test_cases_passed || 0;
        if (new Date(s.submitted_at) > new Date(totals[s.UserId].lastSubmittedAt)) {
            totals[s.UserId].lastSubmittedAt = s.submitted_at;
        }
    }

    const userIds = Object.keys(totals);
    let winnerId = null;
    if (userIds.length === 2) {
        const [a, b] = userIds;
        if (totals[a].passed !== totals[b].passed) {
            winnerId = totals[a].passed > totals[b].passed ? a : b;
        } else {
            // Tie on correctness -> faster finisher wins
            winnerId = new Date(totals[a].lastSubmittedAt) < new Date(totals[b].lastSubmittedAt) ? a : b;
        }
    }

    duel.status = 'COMPLETED';
    duel.WinnerId = winnerId;
    await duel.save();
}

// ---------------------------------------------------------------
// Send a duel invite
// ---------------------------------------------------------------
router.post('/invite', validateToken, async (req, res) => {
    try {
        const { opponent_username, language, question_count } = req.body;

        if (!opponent_username || !language) {
            return res.status(400).json({ error: 'opponent_username and language are required' });
        }
        if (!['PYTHON', 'JAVA', 'JAVASCRIPT'].includes(language)) {
            return res.status(400).json({ error: 'language must be PYTHON, JAVA, or JAVASCRIPT' });
        }

        const opponent = await User.findOne({ where: { username: opponent_username } });
        if (!opponent) {
            return res.status(404).json({ error: 'Opponent not found' });
        }
        if (opponent.id === req.user.id) {
            return res.status(400).json({ error: 'You cannot duel yourself' });
        }

        // Avoid piling up duplicate open invites between the same two users
        const existingPending = await Duel.findOne({
            where: {
                status: 'PENDING',
                [Op.or]: [
                    { ChallengerId: req.user.id, OpponentId: opponent.id },
                    { ChallengerId: opponent.id, OpponentId: req.user.id }
                ]
            }
        });
        if (existingPending) {
            return res.status(400).json({ error: 'There is already a pending duel invite between you two' });
        }

        const parsedCount = Number(question_count);
        const duel = await Duel.create({
            language,
            question_count: Number.isInteger(parsedCount) && parsedCount >= 3 && parsedCount <= 5 ? parsedCount : 3,
            ChallengerId: req.user.id,
            OpponentId: opponent.id
        });

        const challenger = await User.findByPk(req.user.id);
        await Notification.create({
            type: 'DUEL_INVITE',
            message: `${challenger.username} challenged you to a ${language} coding duel!`,
            link: `/duel/${duel.id}`,
            UserId: opponent.id
        });

        res.status(201).json(duel);
    } catch (error) {
        console.error('Error sending duel invite:', error);
        res.status(500).json({ error: 'Failed to send duel invite' });
    }
});

// ---------------------------------------------------------------
// Accept or decline an invite
// ---------------------------------------------------------------
router.post('/:duelId/respond', validateToken, async (req, res) => {
    try {
        const { duelId } = req.params;
        const { accept } = req.body;

        const duel = await Duel.findByPk(duelId);
        if (!duel) return res.status(404).json({ error: 'Duel not found' });
        if (duel.OpponentId !== req.user.id) {
            return res.status(403).json({ error: 'Only the invited opponent can respond' });
        }
        if (duel.status !== 'PENDING') {
            return res.status(400).json({ error: 'This invite has already been responded to' });
        }

        if (!accept) {
            duel.status = 'DECLINED';
            await duel.save();
            return res.json(duel);
        }

        // Pull `question_count` random, distinct questions in the duel's language
        const pool = await QuestionBank.findAll({ where: { language: duel.language } });
        if (pool.length < duel.question_count) {
            return res.status(400).json({ error: 'Not enough questions in the question bank for this language yet' });
        }
        const shuffled = pool.sort(() => 0.5 - Math.random()).slice(0, duel.question_count);

        await Promise.all(shuffled.map((q, index) =>
            DuelQuestion.create({ DuelId: duel.id, QuestionBankId: q.id, order_index: index + 1 })
        ));

        duel.status = 'ACTIVE';
        duel.started_at = new Date();
        await duel.save();

        const opponent = await User.findByPk(req.user.id);
        await Notification.create({
            type: 'DUEL_ACCEPTED',
            message: `${opponent.username} accepted your duel! It's on.`,
            link: `/duel/${duel.id}`,
            UserId: duel.ChallengerId
        });

        res.json(duel);
    } catch (error) {
        console.error('Error responding to duel:', error);
        res.status(500).json({ error: 'Failed to respond to duel' });
    }
});

// ---------------------------------------------------------------
// List all duels I'm part of (any status) — powers the "1v1 Coding
// Duel" tab on the hub page: pending invites, active duels, history
// ---------------------------------------------------------------
router.get('/mine', validateToken, async (req, res) => {
    try {
        const duels = await Duel.findAll({
            where: {
                [Op.or]: [{ ChallengerId: req.user.id }, { OpponentId: req.user.id }]
            },
            include: [
                { model: User, as: 'Challenger', attributes: ['id', 'username', 'profile_picture'] },
                { model: User, as: 'Opponent', attributes: ['id', 'username', 'profile_picture'] },
                { model: User, as: 'Winner', attributes: ['id', 'username', 'profile_picture'] }
            ],
            order: [['createdAt', 'DESC']]
        });
        res.json(duels);
    } catch (error) {
        console.error('Error fetching my duels:', error);
        res.status(500).json({ error: 'Failed to fetch duels' });
    }
});

// ---------------------------------------------------------------
// Get duel detail: metadata + assigned questions (test case inputs
// only — expected_output is withheld from the client)
// ---------------------------------------------------------------
router.get('/:duelId', validateToken, async (req, res) => {
    try {
        const duel = await Duel.findByPk(req.params.duelId, {
            include: [
                { model: User, as: 'Challenger', attributes: ['id', 'username', 'profile_picture'] },
                { model: User, as: 'Opponent', attributes: ['id', 'username', 'profile_picture'] },
                { model: User, as: 'Winner', attributes: ['id', 'username', 'profile_picture'] },
                {
                    model: DuelQuestion,
                    include: [{ model: QuestionBank, attributes: ['id', 'title', 'description', 'language', 'starter_code', 'test_cases'] }]
                }
            ]
        });
        if (!duel) return res.status(404).json({ error: 'Duel not found' });

        if (duel.ChallengerId !== req.user.id && duel.OpponentId !== req.user.id) {
            return res.status(403).json({ error: 'You are not part of this duel' });
        }

        const json = duel.toJSON();
        // Strip expected_output from each question's test cases so the client
        // only sees sample inputs, not the answers
        json.DuelQuestions = json.DuelQuestions.map(dq => ({
            ...dq,
            QuestionBank: {
                ...dq.QuestionBank,
                test_cases: (dq.QuestionBank.test_cases || []).map(tc => ({ input: tc.input }))
            }
        }));

        res.json(json);
    } catch (error) {
        console.error('Error fetching duel:', error);
        res.status(500).json({ error: 'Failed to fetch duel' });
    }
});

// ---------------------------------------------------------------
// Submit code for one question in an active duel
// ---------------------------------------------------------------
router.post('/:duelId/question/:duelQuestionId/submit', validateToken, async (req, res) => {
    try {
        const { duelId, duelQuestionId } = req.params;
        const { code_content } = req.body;

        if (!code_content) {
            return res.status(400).json({ error: 'code_content is required' });
        }

        const duel = await Duel.findByPk(duelId);
        if (!duel) return res.status(404).json({ error: 'Duel not found' });
        if (duel.status !== 'ACTIVE') {
            return res.status(403).json({ error: 'This duel is not active' });
        }
        if (duel.ChallengerId !== req.user.id && duel.OpponentId !== req.user.id) {
            return res.status(403).json({ error: 'You are not part of this duel' });
        }

        const duelQuestion = await DuelQuestion.findByPk(duelQuestionId, {
            include: [{ model: QuestionBank }]
        });
        if (!duelQuestion || duelQuestion.DuelId !== duel.id) {
            return res.status(404).json({ error: 'Question not found in this duel' });
        }

        let submission = await DuelSubmission.findOne({
            where: { UserId: req.user.id, DuelQuestionId: duelQuestionId }
        });

        if (submission && submission.status !== 'PENDING') {
            return res.status(400).json({ error: 'You have already submitted a scored answer for this question' });
        }

        const now = new Date();
        if (submission) {
            submission.code_content = code_content;
            submission.submitted_at = now;
        } else {
            submission = DuelSubmission.build({
                code_content,
                submitted_at: now,
                UserId: req.user.id,
                DuelQuestionId: duelQuestionId
            });
        }

        // Attempt to run test cases (stub — see runTestCases note above)
        const result = await runTestCases(code_content, duel.language, duelQuestion.QuestionBank.test_cases);
        if (result) {
            submission.test_cases_passed = result.passed;
            submission.total_test_cases = result.total;
            submission.status = result.status;
        }
        // else: stays PENDING until a result is posted via /submission/:id/result

        await submission.save();

        if (submission.status !== 'PENDING') {
            await tryResolveDuel(duel.id);
        }

        res.status(201).json(submission);
    } catch (error) {
        console.error('Error submitting duel answer:', error);
        res.status(500).json({ error: 'Failed to submit answer' });
    }
});

// ---------------------------------------------------------------
// Post a test-run result for a submission (called by the execution
// service once wired up, or manually in the meantime)
// ---------------------------------------------------------------
router.put('/submission/:submissionId/result', validateToken, async (req, res) => {
    try {
        const { submissionId } = req.params;
        const { test_cases_passed, total_test_cases, status } = req.body;

        if (test_cases_passed === undefined || total_test_cases === undefined || !status) {
            return res.status(400).json({ error: 'test_cases_passed, total_test_cases, and status are required' });
        }
        if (!['PASSED', 'FAILED'].includes(status)) {
            return res.status(400).json({ error: "status must be 'PASSED' or 'FAILED'" });
        }

        // Numeric validation, matching the pattern used for bounty marks / competition scores
        const parsedPassed = Number(test_cases_passed);
        const parsedTotal = Number(total_test_cases);
        if (!Number.isInteger(parsedPassed) || !Number.isInteger(parsedTotal) || parsedPassed < 0 || parsedTotal < 0) {
            return res.status(400).json({ error: 'test_cases_passed and total_test_cases must be non-negative integers' });
        }
        if (parsedPassed > parsedTotal) {
            return res.status(400).json({ error: 'test_cases_passed cannot exceed total_test_cases' });
        }

        const submission = await DuelSubmission.findByPk(submissionId, {
            include: [{ model: DuelQuestion }]
        });
        if (!submission) return res.status(404).json({ error: 'Submission not found' });

        if (submission.status !== 'PENDING') {
            return res.status(400).json({ error: 'This submission has already been scored' });
        }

        submission.test_cases_passed = parsedPassed;
        submission.total_test_cases = parsedTotal;
        submission.status = status;
        await submission.save();

        await tryResolveDuel(submission.DuelQuestion.DuelId);

        res.json(submission);
    } catch (error) {
        console.error('Error posting submission result:', error);
        res.status(500).json({ error: 'Failed to post result' });
    }
});

// ---------------------------------------------------------------
// List my pending invites (received)
// ---------------------------------------------------------------
router.get('/invites/pending', validateToken, async (req, res) => {
    try {
        const invites = await Duel.findAll({
            where: { OpponentId: req.user.id, status: 'PENDING' },
            include: [{ model: User, as: 'Challenger', attributes: ['id', 'username', 'profile_picture'] }],
            order: [['createdAt', 'DESC']]
        });
        res.json(invites);
    } catch (error) {
        console.error('Error fetching duel invites:', error);
        res.status(500).json({ error: 'Failed to fetch invites' });
    }
});

module.exports = router;
