const Competition = require('../models/Competition');
const CompetitionSubmission = require('../models/CompetitionSubmission');
const User = require('../models/User');

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------

// Returns 'UPCOMING' | 'ACTIVE' | 'CLOSED' based on start_time + duration_minutes
function getPhase(competition) {
    const now = new Date();
    const start = new Date(competition.start_time);
    const end = new Date(start.getTime() + competition.duration_minutes * 60000);

    if (now < start) return 'UPCOMING';
    if (now >= start && now <= end) return 'ACTIVE';
    return 'CLOSED';
}

// Strips question_content unless the question should be visible to this viewer
function serializeCompetition(competition, requestingUserId) {
    const json = competition.toJSON();
    const phase = getPhase(competition);
    const isCreator = requestingUserId && competition.UserId === requestingUserId;

    if (phase === 'UPCOMING' && !isCreator) {
        delete json.question_content;
    }

    return { ...json, phase };
}

async function getCompetitionOr404(competitionId, res) {
    const competition = await Competition.findByPk(competitionId);
    if (!competition) {
        res.status(404).json({ error: 'Competition not found' });
        return null;
    }
    return competition;
}

// ---------------------------------------------------------------
// Host a new competition
// ---------------------------------------------------------------
exports.createCompetition = async (req, res) => {
    try {
        const { title, description, language, question_content, start_time, duration_minutes, evaluation_mode } = req.body;

        if (!title || !language || !question_content || !start_time || !duration_minutes) {
            return res.status(400).json({ error: 'title, language, question_content, start_time, and duration_minutes are required' });
        }

        if (new Date(start_time) <= new Date()) {
            return res.status(400).json({ error: 'start_time must be in the future' });
        }

        const competition = await Competition.create({
            title,
            description,
            language,
            question_content,
            start_time,
            duration_minutes,
            evaluation_mode: evaluation_mode || 'MANUAL',
            UserId: req.user.id
        });

        res.status(201).json(serializeCompetition(competition, req.user.id));
    } catch (error) {
        console.error('Error creating competition:', error);
        res.status(500).json({ error: 'Failed to create competition' });
    }
};

// ---------------------------------------------------------------
// Board: list all competitions (question hidden until it starts)
// ---------------------------------------------------------------
exports.getBoard = async (req, res) => {
    try {
        const competitions = await Competition.findAll({
            order: [['start_time', 'DESC']],
            include: [{ model: User, attributes: ['id', 'username', 'profile_picture'] }]
        });

        // Attach participant counts + strip hidden questions
        const shaped = await Promise.all(competitions.map(async c => {
            const participantCount = await CompetitionSubmission.count({ where: { CompetitionId: c.id } });
            return { ...serializeCompetition(c, null), participant_count: participantCount };
        }));

        res.json(shaped);
    } catch (error) {
        console.error('Error fetching competition board:', error);
        res.status(500).json({ error: 'Failed to fetch competition board' });
    }
};

// ---------------------------------------------------------------
// Get one competition's detail (question gated by start_time)
// ---------------------------------------------------------------
exports.getCompetitionDetail = async (req, res) => {
    try {
        const competition = await getCompetitionOr404(req.params.competitionId, res);
        if (!competition) return;

        res.json(serializeCompetition(competition, req.user.id));
    } catch (error) {
        console.error('Error fetching competition:', error);
        res.status(500).json({ error: 'Failed to fetch competition' });
    }
};

// ---------------------------------------------------------------
// Submit / update a solution — only accepted while phase === ACTIVE
// ---------------------------------------------------------------
exports.submitSolution = async (req, res) => {
    try {
        const { competitionId } = req.params;
        const { code_content } = req.body;

        if (!code_content) {
            return res.status(400).json({ error: 'code_content is required' });
        }

        const competition = await getCompetitionOr404(competitionId, res);
        if (!competition) return;
        if (competition.UserId === req.user.id) {
            return res.status(403).json({ error: 'You cannot submit a solution to a competition you are hosting' });
        }

        const phase = getPhase(competition);
        if (phase === 'UPCOMING') {
            return res.status(403).json({ error: 'This competition has not started yet' });
        }
        if (phase === 'CLOSED') {
            return res.status(403).json({ error: 'The submission window has closed' });
        }

        let submission = await CompetitionSubmission.findOne({
            where: { UserId: req.user.id, CompetitionId: competitionId }
        });

        if (submission) {
            if (submission.status === 'EVALUATED') {
                return res.status(400).json({ error: 'This submission has already been evaluated' });
            }
            // Update the code but keep the original submission timestamp
            submission.code_content = code_content;
            await submission.save();
        } else {
            submission = await CompetitionSubmission.create({
                code_content,
                first_submitted_at: new Date(),
                UserId: req.user.id,
                CompetitionId: competitionId
            });
        }

        res.status(201).json(submission);
    } catch (error) {
        console.error('Error submitting competition solution:', error);
        res.status(500).json({ error: 'Failed to submit solution' });
    }
};

// ---------------------------------------------------------------
// Creator-only: view all submissions once the window has closed
// ---------------------------------------------------------------
exports.getSubmissions = async (req, res) => {
    try {
        const { competitionId } = req.params;
        const competition = await getCompetitionOr404(competitionId, res);
        if (!competition) return;

        if (competition.UserId !== req.user.id) {
            return res.status(403).json({ error: 'Only the host can view submissions' });
        }

        const submissions = await CompetitionSubmission.findAll({
            where: { CompetitionId: competitionId },
            include: [{ model: User, attributes: ['id', 'username', 'profile_picture'] }],
            order: [['first_submitted_at', 'ASC']]
        });

        res.json(submissions);
    } catch (error) {
        console.error('Error fetching competition submissions:', error);
        res.status(500).json({ error: 'Failed to fetch submissions' });
    }
};

// ---------------------------------------------------------------
// Creator-only: score a submission (manual review; also used for AUTO mode results)
// ---------------------------------------------------------------
exports.evaluateSubmission = async (req, res) => {
    try {
        const { submissionId } = req.params;
        const { score, time_complexity, feedback } = req.body;

        if (score === undefined || score === null) {
            return res.status(400).json({ error: 'score is required' });
        }

        const parsedScore = Number(score);
        if (!Number.isFinite(parsedScore) || parsedScore < 0 || parsedScore > 10) {
            return res.status(400).json({ error: 'score must be a number between 0 and 10' });
        }
        const submission = await CompetitionSubmission.findByPk(submissionId, {
            include: [{ model: Competition }]
        });
        if (!submission) {
            return res.status(404).json({ error: 'Submission not found' });
        }

        if (submission.Competition.UserId !== req.user.id) {
            return res.status(403).json({ error: 'Only the host can evaluate this submission' });
        }

        const phase = getPhase(submission.Competition);
        if (phase === 'ACTIVE') {
            return res.status(403).json({ error: 'Cannot evaluate submissions while the competition is still active' });
        }
        if (submission.status === 'EVALUATED') {
            return res.status(400).json({ error: 'Submission has already been evaluated' });
        }

        submission.score = parsedScore;
        submission.time_complexity = time_complexity || null;
        submission.feedback = feedback || null;
        submission.status = 'EVALUATED';
        await submission.save();

        res.json({ message: 'Submission evaluated successfully', submission });
    } catch (error) {
        console.error('Error evaluating submission:', error);
        res.status(500).json({ error: 'Failed to evaluate submission' });
    }
};

// ---------------------------------------------------------------
// Leaderboard — ranked by score (desc), tie-broken by earliest submission
// ---------------------------------------------------------------
exports.getLeaderboard = async (req, res) => {
    try {
        const { competitionId } = req.params;
        const competition = await getCompetitionOr404(competitionId, res);
        if (!competition) return;

        const leaderboard = await CompetitionSubmission.findAll({
            where: { CompetitionId: competitionId, status: 'EVALUATED' },
            include: [{ model: User, attributes: ['id', 'username', 'profile_picture'] }],
            order: [['score', 'DESC'], ['first_submitted_at', 'ASC']]
        });

        const ranked = leaderboard.map((entry, index) => ({
            rank: index + 1,
            user: entry.User,
            score: entry.score,
            time_complexity: entry.time_complexity,
            submitted_at: entry.first_submitted_at
        }));

        res.json(ranked);
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
};

// ---------------------------------------------------------------
// Let a participant check their own submission's score/feedback
// ---------------------------------------------------------------
exports.getMySubmission = async (req, res) => {
    try {
        const { competitionId } = req.params;
        const submission = await CompetitionSubmission.findOne({
            where: { UserId: req.user.id, CompetitionId: competitionId }
        });
        if (!submission) {
            return res.status(404).json({ error: 'You have not submitted to this competition' });
        }
        res.json(submission);
    } catch (error) {
        console.error('Error fetching my submission:', error);
        res.status(500).json({ error: 'Failed to fetch your submission' });
    }
};

// ---------------------------------------------------------------
// GET /api/competition/stats — stats box shown on the Competition tab.
// "Active"/"Completed" are platform-wide, computed from live phase
// (start_time + duration_minutes), same rule getCompetitionDetail uses —
// not a stored status field, since phase is always derived, never stale.
// "Hosted by Me"/"Submitted by Me" are specific to the logged-in user.
// ---------------------------------------------------------------
exports.getStats = async (req, res) => {
    try {
        const allCompetitions = await Competition.findAll();
        let activeCount = 0;
        let completedCount = 0;
        for (const c of allCompetitions) {
            const phase = getPhase(c);
            if (phase === 'ACTIVE') activeCount++;
            else if (phase === 'CLOSED') completedCount++;
        }

        const myHostedCount = await Competition.count({ where: { UserId: req.user.id } });
        const mySubmittedCount = await CompetitionSubmission.count({ where: { UserId: req.user.id } });

        res.json({
            active: activeCount,
            completed: completedCount,
            myHosted: myHostedCount,
            mySubmitted: mySubmittedCount
        });
    } catch (error) {
        console.error('Error fetching competition stats:', error);
        res.status(500).json({ error: 'Failed to fetch competition stats' });
    }
};