const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const Vote = require('../models/Vote');
const BountyEnrollment = require('../models/BountyEnrollment');
const CompetitionSubmission = require('../models/CompetitionSubmission');
const Competition = require('../models/Competition');
const Duel = require('../models/Duel');
const { Op } = require('sequelize');
const { validateToken } = require('../middlewares/AuthMiddleware');

const MAX_PINNED = 4;

// =================================================================
// BADGE DEFINITIONS
// Hardcoded, same pattern as the quiz question bank — no DB table for
// content, just criteria evaluated against a freshly-computed stats
// object. Add new badges here; nothing else needs to change to support them.
//
// Deliberately includes very low-threshold "first try" badges (1 post,
// 1 comment, 1 vote, 1 duel played, 1 bounty joined, 1 competition entered,
// 1 follower) alongside bigger milestones — new users should earn something
// almost immediately, not just after heavy grinding.
// =================================================================
const BADGES = [
    // Posting
    { id: 'first_post', name: 'First Steps', icon: '📝', description: 'Publish your first post.', check: (s) => s.posts >= 1 },
    { id: 'active_contributor', name: 'Active Contributor', icon: '🖋️', description: 'Publish 10 or more posts.', check: (s) => s.posts >= 10 },
    { id: 'prolific_poster', name: 'Prolific Poster', icon: '✍️', description: 'Publish 25 or more posts.', check: (s) => s.posts >= 25 },

    // Engagement (comments/votes) — the easiest badges on the whole list
    { id: 'first_comment', name: 'Joining the Conversation', icon: '💬', description: 'Leave your first comment.', check: (s) => s.comments >= 1 },
    { id: 'first_vote', name: 'Making Your Voice Heard', icon: '👍', description: 'Cast your first vote.', check: (s) => s.votes >= 1 },

    // Social
    { id: 'first_follower', name: 'Making Friends', icon: '🤝', description: 'Gain your first follower.', check: (s) => s.followers >= 1 },
    { id: 'popular', name: 'Popular', icon: '⭐', description: 'Reach 50 followers.', check: (s) => s.followers >= 50 },

    // 1v1 Duels
    { id: 'first_duel_played', name: 'Entering the Arena', icon: '🛡️', description: 'Complete your first 1v1 coding duel.', check: (s) => s.duelsPlayed >= 1 },
    { id: 'first_duel_win', name: 'Duelist', icon: '⚔️', description: 'Win your first 1v1 coding duel.', check: (s) => s.duelWins >= 1 },
    { id: 'duel_champion', name: 'Duel Champion', icon: '🗡️', description: 'Win 10 or more 1v1 coding duels.', check: (s) => s.duelWins >= 10 },

    // Micro-Bounty
    { id: 'first_bounty_join', name: 'Bounty Participant', icon: '🧭', description: 'Enroll in your first Micro-Bounty.', check: (s) => s.bountyEnrollments >= 1 },
    { id: 'first_bounty', name: 'Bounty Hunter', icon: '🎯', description: 'Get a Micro-Bounty submission reviewed and marked.', check: (s) => s.bountyCompletions >= 1 },
    { id: 'bounty_master', name: 'Bounty Master', icon: '🏹', description: 'Complete 10 or more Micro-Bounties.', check: (s) => s.bountyCompletions >= 10 },

    // Timed Coding Competition
    { id: 'first_competition_entry', name: 'Competitor', icon: '🚩', description: 'Submit a solution to your first Timed Coding Competition.', check: (s) => s.competitionSubmissions >= 1 },
    { id: 'podium_finish', name: 'Podium Finish', icon: '🏆', description: 'Place in the top 3 of any Timed Coding Competition.', check: (s) => s.goldCount + s.silverCount + s.bronzeCount >= 1 },
    { id: 'gold_standard', name: 'Gold Standard', icon: '🥇', description: 'Win 1st place in 3 or more competitions.', check: (s) => s.goldCount >= 3 },

    // Elo
    { id: 'rising_elo', name: 'Rising Star', icon: '📈', description: 'Reach an Elo rating of 1050.', check: (s) => s.elo >= 1050 },
    { id: 'strong_elo', name: 'Strong Contender', icon: '🔥', description: 'Reach an Elo rating of 1200.', check: (s) => s.elo >= 1200 },
    { id: 'elite_elo', name: 'Elite', icon: '👑', description: 'Reach an Elo rating of 1500.', check: (s) => s.elo >= 1500 }
];

// Gathers the raw numbers every badge's `check` function needs. Kept in one
// place so adding a new badge criterion later usually just means adding a
// field here plus a new BADGES entry, not touching the route logic.
async function computeUserStats(user) {
    const posts = await Post.count({ where: { UserId: user.id } });
    const comments = await Comment.count({ where: { UserId: user.id } });
    const votes = await Vote.count({ where: { UserId: user.id } });
    const followers = await user.countFollowers();

    const bountyEnrollments = await BountyEnrollment.count({ where: { UserId: user.id } });
    const bountyCompletions = await BountyEnrollment.count({ where: { UserId: user.id, status: 'COMPLETED' } });

    const duelsPlayed = await Duel.count({
        where: {
            status: 'COMPLETED',
            [Op.or]: [{ ChallengerId: user.id }, { OpponentId: user.id }]
        }
    });
    const duelWins = await Duel.count({ where: { WinnerId: user.id, status: 'COMPLETED' } });

    const competitionSubmissions = await CompetitionSubmission.count({ where: { UserId: user.id } });

    const mySubmissions = await CompetitionSubmission.findAll({
        where: { UserId: user.id },
        include: [{ model: Competition, attributes: ['id'] }]
    });
    let goldCount = 0, silverCount = 0, bronzeCount = 0;
    for (const mySub of mySubmissions) {
        const allSubs = await CompetitionSubmission.findAll({ where: { CompetitionId: mySub.CompetitionId } });
        if (allSubs.length === 0 || allSubs.some(s => s.status !== 'EVALUATED')) continue;
        const ranked = [...allSubs].sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return new Date(a.first_submitted_at) - new Date(b.first_submitted_at);
        });
        const myRank = ranked.findIndex(s => s.UserId === user.id) + 1;
        if (myRank === 1) goldCount++;
        else if (myRank === 2) silverCount++;
        else if (myRank === 3) bronzeCount++;
    }

    return {
        posts, comments, votes, followers,
        bountyEnrollments, bountyCompletions,
        duelsPlayed, duelWins,
        competitionSubmissions, goldCount, silverCount, bronzeCount,
        elo: user.elo
    };
}

// ---------------------------------------------------------------
// GET /api/badges/:username — all badges with earned status, plus
// which ones (in order) this user has chosen to pin
// ---------------------------------------------------------------
router.get('/:username', async (req, res) => {
    try {
        const user = await User.findOne({ where: { username: req.params.username } });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const stats = await computeUserStats(user);
        const earned = BADGES.filter(b => b.check(stats)).map(({ check, ...rest }) => rest);
        const earnedIds = new Set(earned.map(b => b.id));

        const pinnedIds = Array.isArray(user.pinned_badge_ids) ? user.pinned_badge_ids : [];
        const pinned = pinnedIds
            .filter(id => earnedIds.has(id))
            .map(id => earned.find(b => b.id === id));

        res.json({ earned, pinned });
    } catch (error) {
        console.error('Error fetching badges:', error);
        res.status(500).json({ error: 'Failed to fetch badges' });
    }
});

// ---------------------------------------------------------------
// PUT /api/badges/pin — choose up to 4 earned badges to showcase
// ---------------------------------------------------------------
router.put('/pin', validateToken, async (req, res) => {
    try {
        const { badge_ids } = req.body;
        if (!Array.isArray(badge_ids)) {
            return res.status(400).json({ error: 'badge_ids must be an array' });
        }
        if (badge_ids.length > MAX_PINNED) {
            return res.status(400).json({ error: `You can pin at most ${MAX_PINNED} badges` });
        }

        const user = await User.findByPk(req.user.id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const stats = await computeUserStats(user);
        const earnedIds = new Set(BADGES.filter(b => b.check(stats)).map(b => b.id));

        const invalid = badge_ids.filter(id => !earnedIds.has(id));
        if (invalid.length > 0) {
            return res.status(400).json({ error: `You have not earned: ${invalid.join(', ')}` });
        }

        user.pinned_badge_ids = badge_ids;
        await user.save();

        res.json({ pinned_badge_ids: user.pinned_badge_ids });
    } catch (error) {
        console.error('Error pinning badges:', error);
        res.status(500).json({ error: 'Failed to update pinned badges' });
    }
});

module.exports = router;
