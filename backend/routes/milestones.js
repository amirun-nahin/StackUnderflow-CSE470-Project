const express = require('express');
const router = express.Router();
const sequelize = require('../config/db');
const Post = require('../models/Post');
const BountyEnrollment = require('../models/BountyEnrollment');
const User = require('../models/User');
const { validateToken } = require('../middlewares/AuthMiddleware');

// Computes { mine, average, highest } for a count-based stat (posts,
// completed bounties, etc). `average` is total count divided by the total
// number of registered users (so inactive users pull the average down,
// same as a true platform-wide average) — not just users who have at
// least one row, which would inflate it.
async function computeCountStats(Model, whereClause, userId, totalUserCount) {
    const rows = await Model.findAll({
        where: whereClause,
        attributes: ['UserId', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
        group: ['UserId'],
        raw: true
    });

    const counts = rows.map(r => Number(r.count));
    const totalCount = counts.reduce((sum, c) => sum + c, 0);
    const average = totalUserCount ? totalCount / totalUserCount : 0;
    const highest = counts.length ? Math.max(...counts) : 0;
    const mineRow = rows.find(r => r.UserId === userId);
    const mine = mineRow ? Number(mineRow.count) : 0;

    return { mine, average: Math.round(average * 10) / 10, highest };
}

// ---------------------------------------------------------------
// GET /api/milestones — stats for the logged-in user
// ---------------------------------------------------------------
router.get('/', validateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const totalUserCount = await User.count();

        const [posts, bounties] = await Promise.all([
            computeCountStats(Post, {}, userId, totalUserCount),
            computeCountStats(BountyEnrollment, { status: 'COMPLETED' }, userId, totalUserCount)
        ]);

        // Points already live directly on User, no grouping needed
        const allUsers = await User.findAll({ attributes: ['id', 'points'], raw: true });
        const pointValues = allUsers.map(u => u.points || 0);
        const pointsAverage = pointValues.length
            ? pointValues.reduce((sum, p) => sum + p, 0) / pointValues.length
            : 0;
        const pointsHighest = pointValues.length ? Math.max(...pointValues) : 0;
        const myPointsRow = allUsers.find(u => u.id === userId);
        const points = {
            mine: myPointsRow ? myPointsRow.points : 0,
            average: Math.round(pointsAverage * 10) / 10,
            highest: pointsHighest
        };

        const userInstance = await User.findByPk(userId);
        const followers_count = await userInstance.countFollowers();

        const repo_requests_count = await Post.count({
            where: { UserId: userId, category: 'REPO_REQUEST' }
        });

        res.json({
            posts,
            bounties,
            points,
            followers_count,
            repo_requests_count
        });
    } catch (error) {
        console.error('Error fetching milestones:', error);
        res.status(500).json({ error: 'Failed to fetch milestones' });
    }
});

module.exports = router;
