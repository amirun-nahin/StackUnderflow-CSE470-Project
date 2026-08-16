const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const User = require('../models/User');
const Comment = require('../models/Comment');
const Vote = require('../models/Vote');
const { validateToken } = require('../middlewares/AuthMiddleware'); 
const RepoRequestJoin = require('../models/RepoRequestJoin');
const Group = require('../models/Group');
const GroupMember = require('../models/GroupMember');

// Feed Routes
// Get Global Feed
router.get('/feed', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 20;
        const offset = (page - 1) * limit;

        const posts = await Post.findAll({
            where: {GroupId: null},
            limit: limit,
            offset: offset,
            order: [['createdAt', 'DESC']],
            include: [
                { model: User, attributes: ['id', 'username', 'profile_picture'] },
                { model: Vote },
                { model: Comment, include: [{ model: User, attributes: ['username'] }] },
                { model: RepoRequestJoin, include: [{ model: User, attributes: ['id', 'username', 'profile_picture'] }] }
            ]
        });
        res.json(posts);

    } catch (error) {
        console.error("Error fetching global feed:", error);
        res.status(500).json({ error: 'Failed to fetch feed' });
    }
});

// Get Following Feed
router.get('/feed/following', validateToken, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 20;
        const offset = (page - 1) * limit;

        // Use req.user.id set by validateToken
        const currentUser = await User.findByPk(req.user.id, {
            include: [{ model: User, as: 'Following', attributes: ['id'] },
            { model: RepoRequestJoin, include: [{ model: User, attributes: ['id', 'username', 'profile_picture'] }] }]
        });

        if (!currentUser) {
            return res.status(404).json({ error: 'User not found' })
        };

        const followingIds = currentUser.Following.map(user => user.id);

        if (followingIds.length === 0) {
            return res.json([]);
        }

        const posts = await Post.findAll({
            where: { UserId: followingIds , GroupId: null},
            limit: limit,
            offset: offset,
            order: [['createdAt', 'DESC']],
            include: [
                { model: User, attributes: ['id', 'username', 'profile_picture'] },
                { model: Vote },
                { model: Comment, include: [{ model: User, attributes: ['username'] }] }
            ]
        });

        res.json(posts);
    } catch (error) {
        console.error("Error in /feed/following:", error);
        res.status(500).json({ error: 'Failed to fetch following feed' });
    }
});


// Get Single Post
router.get('/:postId', validateToken, async (req, res) => {
    try {   
        const { postId } = req.params;
        const post = await Post.findByPk(postId, {
            include: [
                { model: User, attributes: ['id', 'username', 'profile_picture'] },
                { model: Vote },
                { 
                    model: Comment, 
                    include: [{ model: User, attributes: ['username'] }],
                    order: [['createdAt', 'ASC']]
                },
                { model: RepoRequestJoin, include: [{ model: User, attributes: ['id', 'username', 'profile_picture'] }] }
            ]
        });

        if (!post) return res.status(404).json({ error: 'Post not found' });
        // If this post belongs to a private group, only approved members can view it
        if (post.GroupId) {
            const group = await Group.findByPk(post.GroupId);
            if (group && group.is_private) {
                const member = await GroupMember.findOne({
                    where: { GroupId: group.id, UserId: req.user.id, status: 'APPROVED' }
                });
                if (!member) {
                    return res.status(403).json({ error: 'This post belongs to a private group. Access denied.' });
                }
            }
        }
        res.json(post);
    } catch (error) {
        console.error("Error fetching single post:", error);
        res.status(500).json({ error: 'Failed to fetch post' });
    }
});

// Create a new post
router.post('/create', validateToken, async (req, res) => {
    try {
        const { text_content, code_snippet, category, language, bounty_reward_points, bounty_deadline, repo_name, people_needed } = req.body;

        // Repository Request posts need a repo name and a people count
        if (category === 'REPO_REQUEST') {
            if (!repo_name || !repo_name.trim()) {
                return res.status(400).json({ error: 'Repository name is required for a Repository Request' });
            }
            if (!people_needed || Number(people_needed) < 1) {
                return res.status(400).json({ error: 'A valid number of people needed is required for a Repository Request' });
            }
        }

        const newPost = await Post.create({
            text_content,
            code_snippet,
            category,
            language: language || 'General',
            bounty_reward_points: bounty_reward_points ?? null,
            bounty_deadline: bounty_deadline ?? null,
            repo_name: category === 'REPO_REQUEST' ? repo_name.trim() : null,
            people_needed: category === 'REPO_REQUEST' ? Number(people_needed) : null,
            UserId: req.user.id
        });

        const postWithUser = await Post.findByPk(newPost.id, {
            include: [{ model: User, attributes: ['username', 'profile_picture'] }]
        });

        res.status(201).json(postWithUser);
    } catch (error) {
        console.error("Error creating post:", error);
        res.status(500).json({ error: 'Failed to create post' });
    }
});


// Upvote / Downvote
router.post('/:postId/vote', validateToken, async (req, res) => {
    try {
        const { type } = req.body;
        const { postId } = req.params;
        const userId = req.user.id;

        const existingVote = await Vote.findOne({ where: { UserId: userId, PostId: postId } });

        if (existingVote) {
            if (existingVote.type === type) {
                await existingVote.destroy();
                return res.json({ message: 'Vote removed' });
            } else {
                existingVote.type = type;
                await existingVote.save();
                return res.json({ message: 'Vote updated' });
            }
        }

        await Vote.create({ UserId: userId, PostId: postId, type });
        res.status(201).json({ message: 'Vote cast successfully' });
    } catch (error) {
        console.error("Error casting vote:", error);
        res.status(500).json({ error: 'Failed to cast vote' });
    }
});

// Create a comment
router.post('/:postId/comment', validateToken, async (req, res) => {
    try {
        const { postId } = req.params;
        const { text_content, ParentId } = req.body; 

        const newComment = await Comment.create({
            text_content,
            UserId: req.user.id,
            PostId: postId,
            ParentId: ParentId || null 
        });

        res.status(201).json(newComment);
    } catch (error) {
        console.error("Error posting comment:", error);
        res.status(500).json({ error: 'Failed to post comment' });
    }
});

// Delete a comment
router.delete('/:postId/comment/:commentId', validateToken, async (req, res) => {
    try {
        const { commentId } = req.params;

        const comment = await Comment.findByPk(commentId);
        if (!comment) {
            return res.status(404).json({ error: 'Comment not found' })
        };

        if (comment.UserId !== req.user.id) { 
            return res.status(403).json({ error: 'Not authorized to delete this comment' });
        }

        comment.is_deleted = true;
        await comment.save();

        res.json({ message: 'Comment soft-deleted successfully', comment });
    } catch (error) {
        console.error("Error deleting comment:", error);
        res.status(500).json({ error: 'Failed to delete comment' });
    }
});

module.exports = router;