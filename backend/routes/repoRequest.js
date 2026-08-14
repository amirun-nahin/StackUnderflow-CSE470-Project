const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const RepoRequestJoin = require('../models/RepoRequestJoin');
const { validateToken } = require('../middlewares/AuthMiddleware');

// Small helper so both routes consistently reject non-repo-request posts
async function getRepoRequestPostOr404(postId, res) {
    const post = await Post.findByPk(postId);
    if (!post) {
        res.status(404).json({ error: 'Repository request not found' });
        return null;
    }
    if (post.category !== 'REPO_REQUEST') {
        res.status(400).json({ error: 'This post is not a Repository Request' });
        return null;
    }
    return post;
}

// ---------------------------------------------------------------
// Join a repository request
// ---------------------------------------------------------------
router.post('/:postId/join', validateToken, async (req, res) => {
    try {
        const { postId } = req.params;
        const post = await getRepoRequestPostOr404(postId, res);
        if (!post) return;

        if (post.UserId === req.user.id) {
            return res.status(400).json({ error: 'You cannot join your own repository request' });
        }

        const existing = await RepoRequestJoin.findOne({ where: { UserId: req.user.id, PostId: postId } });
        if (existing) {
            return res.status(400).json({ error: 'You have already joined this repository request' });
        }

        if (post.people_needed) {
            const currentCount = await RepoRequestJoin.count({ where: { PostId: postId } });
            if (currentCount >= post.people_needed) {
                return res.status(400).json({ error: 'This repository request is already full' });
            }
        }

        const join = await RepoRequestJoin.create({ UserId: req.user.id, PostId: postId });
        res.status(201).json(join);
    } catch (error) {
        console.error('Error joining repository request:', error);
        res.status(500).json({ error: 'Failed to join repository request' });
    }
});

// ---------------------------------------------------------------
// Leave a repository request
// ---------------------------------------------------------------
router.delete('/:postId/join', validateToken, async (req, res) => {
    try {
        const { postId } = req.params;
        const join = await RepoRequestJoin.findOne({ where: { UserId: req.user.id, PostId: postId } });
        if (!join) {
            return res.status(404).json({ error: 'You have not joined this repository request' });
        }
        await join.destroy();
        res.json({ message: 'Left the repository request successfully' });
    } catch (error) {
        console.error('Error leaving repository request:', error);
        res.status(500).json({ error: 'Failed to leave repository request' });
    }
});

module.exports = router;