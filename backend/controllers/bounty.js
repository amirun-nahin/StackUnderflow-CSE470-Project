const Post = require('../models/Post');
const User = require('../models/User');
const BountyEnrollment = require('../models/BountyEnrollment');
const BountySubmission = require('../models/BountySubmission');
const { Op } = require('sequelize');

// Small helper so every route consistently rejects non-bounty posts
async function getBountyPostOr404(postId, res) {
    const post = await Post.findByPk(postId);
    if (!post) {
        res.status(404).json({ error: 'Bounty not found' });
        return null;
    }
    if (post.category !== 'MICRO_BOUNTY') {
        res.status(400).json({ error: 'This post is not a Micro-Bounty' });
        return null;
    }
    return post;
}

// ---------------------------------------------------------------
// GET the board: all Micro-Bounty posts, with enrolled user count
// and enrolled usernames, meant to render directly under Trending.
// ---------------------------------------------------------------
exports.getBoard = async (req, res) => {
    try {
        const bounties = await Post.findAll({
            where: { category: 'MICRO_BOUNTY' },
            order: [['createdAt', 'DESC']],
            include: [
                { model: User, attributes: ['id', 'username', 'profile_picture'] },
                {
                    model: BountyEnrollment,
                    include: [{ model: User, attributes: ['id', 'username', 'profile_picture'] }]
                }
            ]
        });

        // Shape the response so the frontend gets a ready-to-render count + name list
        const shaped = bounties.map(b => {
            const json = b.toJSON();
            return {
                ...json,
                enrolled_count: json.BountyEnrollments.length,
                enrolled_users: json.BountyEnrollments.map(e => e.User)
            };
        });

        res.json(shaped);
    } catch (error) {
        console.error('Error fetching bounty board:', error);
        res.status(500).json({ error: 'Failed to fetch bounty board' });
    }
};

// ---------------------------------------------------------------
// Enroll in a bounty
// ---------------------------------------------------------------
exports.enroll = async (req, res) => {
    try {
        const { postId } = req.params;
        const post = await getBountyPostOr404(postId, res);
        if (!post) return;

        if (post.bounty_deadline && new Date() > new Date(post.bounty_deadline)) {
            return res.status(403).json({ error: 'This bounty has passed its deadline' });
        }

        if (post.UserId === req.user.id) {
            return res.status(400).json({ error: 'You cannot enroll in your own bounty' });
        }

        const existing = await BountyEnrollment.findOne({ where: { UserId: req.user.id, PostId: postId } });
        if (existing) {
            return res.status(400).json({ error: 'Already enrolled in this bounty' });
        }

        const enrollment = await BountyEnrollment.create({ UserId: req.user.id, PostId: postId });
        res.status(201).json(enrollment);
    } catch (error) {
        console.error('Error enrolling in bounty:', error);
        res.status(500).json({ error: 'Failed to enroll in bounty' });
    }
};

// ---------------------------------------------------------------
// Unenroll (before submitting)
// ---------------------------------------------------------------
exports.unenroll = async (req, res) => {
    try {
        const { postId } = req.params;
        const enrollment = await BountyEnrollment.findOne({ where: { UserId: req.user.id, PostId: postId } });
        if (!enrollment) {
            return res.status(404).json({ error: 'You are not enrolled in this bounty' });
        }
        if (enrollment.status !== 'ENROLLED') {
            return res.status(400).json({ error: 'Cannot unenroll after submitting a solution' });
        }
        await enrollment.destroy();
        res.json({ message: 'Unenrolled successfully' });
    } catch (error) {
        console.error('Error unenrolling from bounty:', error);
        res.status(500).json({ error: 'Failed to unenroll' });
    }
};

// ---------------------------------------------------------------
// List everyone enrolled in a given bounty (names + count for the board)
// ---------------------------------------------------------------
exports.getEnrollments = async (req, res) => {
    try {
        const { postId } = req.params;
        const enrollments = await BountyEnrollment.findAll({
            where: { PostId: postId },
            include: [{ model: User, attributes: ['id', 'username', 'profile_picture'] }]
        });
        res.json({ count: enrollments.length, enrollments });
    } catch (error) {
        console.error('Error fetching enrollments:', error);
        res.status(500).json({ error: 'Failed to fetch enrollments' });
    }
};

// ---------------------------------------------------------------
// Submit a solution (must be enrolled first)
// ---------------------------------------------------------------
exports.submitSolution = async (req, res) => {
    try {
        const { postId } = req.params;
        const { code_content } = req.body;

        if (!code_content) {
            return res.status(400).json({ error: 'code_content is required' });
        }

        const post = await getBountyPostOr404(postId, res);
        if (!post) return;

        if (post.bounty_deadline && new Date() > new Date(post.bounty_deadline)) {
            return res.status(403).json({ error: 'This bounty has passed its deadline' });
        }

        const enrollment = await BountyEnrollment.findOne({ where: { UserId: req.user.id, PostId: postId } });
        if (!enrollment) {
            return res.status(403).json({ error: 'You must enroll before submitting a solution' });
        }

        // Allow resubmission while still pending review; once reviewed, no more edits.
        let submission = await BountySubmission.findOne({ where: { UserId: req.user.id, PostId: postId } });
        if (submission) {
            if (submission.status === 'REVIEWED') {
                return res.status(400).json({ error: 'This submission has already been reviewed and cannot be changed' });
            }
            submission.code_content = code_content;
            await submission.save();
        } else {
            submission = await BountySubmission.create({
                code_content,
                UserId: req.user.id,
                PostId: postId
            });
        }

        enrollment.status = 'SUBMITTED';
        await enrollment.save();

        res.status(201).json(submission);
    } catch (error) {
        console.error('Error submitting bounty solution:', error);
        res.status(500).json({ error: 'Failed to submit solution' });
    }
};

// ---------------------------------------------------------------
// Creator-only: view all submissions for their bounty
// ---------------------------------------------------------------
exports.getSubmissions = async (req, res) => {
    try {
        const { postId } = req.params;
        const post = await getBountyPostOr404(postId, res);
        if (!post) return;

        if (post.UserId !== req.user.id) {
            return res.status(403).json({ error: 'Only the bounty creator can view submissions' });
        }

        const submissions = await BountySubmission.findAll({
            where: { PostId: postId },
            include: [{ model: User, attributes: ['id', 'username', 'profile_picture'] }],
            order: [['createdAt', 'ASC']]
        });

        res.json(submissions);
    } catch (error) {
        console.error('Error fetching submissions:', error);
        res.status(500).json({ error: 'Failed to fetch submissions' });
    }
};

// ---------------------------------------------------------------
// Creator-only: review a submission, award marks, credit the user's points
// ---------------------------------------------------------------
exports.reviewSubmission = async (req, res) => {
    try {
        const { submissionId } = req.params;
        const { marks, feedback } = req.body;

        if (marks === undefined || marks === null) {
            return res.status(400).json({ error: 'marks is required' });
        }

        const parsedMarks = Number(marks);
        if (!Number.isFinite(parsedMarks) || parsedMarks < 0) {
            return res.status(400).json({ error: 'marks must be a non-negative number' });
        }

        const submission = await BountySubmission.findByPk(submissionId, {
            include: [{ model: Post }]
        });
        if (!submission) {
            return res.status(404).json({ error: 'Submission not found' });
        }

        if (submission.Post.UserId !== req.user.id) {
            return res.status(403).json({ error: 'Only the bounty creator can review this submission' });
        }

        if (submission.status === 'REVIEWED') {
            return res.status(400).json({ error: 'Submission has already been reviewed' });
        }

        submission.marks = parsedMarks;
        submission.feedback = feedback || null;
        submission.status = 'REVIEWED';
        await submission.save();

        // Credit the solver's profile points
        const solver = await User.findByPk(submission.UserId);
        solver.points += parsedMarks;
        solver.elo = (solver.elo || 1000) + Math.min(15, Math.round(parsedMarks / 2));
        await solver.save();

        // Mark their enrollment as completed
        await BountyEnrollment.update(
            { status: 'COMPLETED' },
            { where: { UserId: submission.UserId, PostId: submission.PostId } }
        );

        res.json({ message: 'Submission reviewed successfully', submission });
    } catch (error) {
        console.error('Error reviewing submission:', error);
        res.status(500).json({ error: 'Failed to review submission' });
    }
};

// ---------------------------------------------------------------
// GET /api/bounty/stats — the stats box shown on the Micro-Bounty tab.
// "Active"/"Completed" are platform-wide counts; "I posted"/"I enrolled"
// are specific to the logged-in user.
//
// Note: Post.bounty_status is never actually flipped to 'CLOSED' anywhere
// in the app (it just sits at its 'OPEN' default forever), so "completed"
// here is defined by real activity instead: a bounty counts as completed
// once at least one of its enrollments has been reviewed (status COMPLETED).
// ---------------------------------------------------------------
exports.getStats = async (req, res) => {
    try {
        const now = new Date();

        const activeCount = await Post.count({
            where: {
                category: 'MICRO_BOUNTY',
                bounty_status: 'OPEN',
                [Op.or]: [
                    { bounty_deadline: null },
                    { bounty_deadline: { [Op.gte]: now } }
                ]
            }
        });

        // "Completed" here means a bounty that's actually received a
        // submission — reviewed or not. Rename note: this counts bounties
        // with submitted work, not necessarily ones a host has judged yet.
        const completedCount = await Post.count({
            where: { category: 'MICRO_BOUNTY' },
            include: [{
                model: BountySubmission,
                required: true
            }],
            distinct: true
        });

        const myPostedCount = await Post.count({
            where: { UserId: req.user.id, category: 'MICRO_BOUNTY' }
        });

        const myEnrolledCount = await BountyEnrollment.count({
            where: { UserId: req.user.id }
        });

        res.json({
            active: activeCount,
            completed: completedCount,
            myPosted: myPostedCount,
            myEnrolled: myEnrolledCount
        });
    } catch (error) {
        console.error('Error fetching bounty stats:', error);
        res.status(500).json({ error: 'Failed to fetch bounty stats' });
    }
};