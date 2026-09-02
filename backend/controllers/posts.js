const Post = require('../models/Post');
const User = require('../models/User');
const Comment = require('../models/Comment');
const Vote = require('../models/Vote');
const RepoRequestJoin = require('../models/RepoRequestJoin');
const Group = require('../models/Group');
const GroupMember = require('../models/GroupMember');
const CodeComment = require('../models/CodeComment');

// Feed Routes
// Get Global Feed
exports.getFeed = async (req, res) => {
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
                { model: RepoRequestJoin, include: [{ model: User, attributes: ['id', 'username', 'profile_picture'] }] },
                { model: Group, as: 'RepoGroup', attributes: ['id', 'name'] }
            ]
        });
        res.json(posts);

    } catch (error) {
        console.error("Error fetching global feed:", error);
        res.status(500).json({ error: 'Failed to fetch feed' });
    }
};

// Get Following Feed
exports.getFollowingFeed = async (req, res) => {
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
};


// Get Single Post
exports.getSinglePost = async (req, res) => {
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
                { model: RepoRequestJoin, include: [{ model: User, attributes: ['id', 'username', 'profile_picture'] }] },
                { model: Group, as: 'RepoGroup', attributes: ['id', 'name'] },
                { model: CodeComment, include: [{ model: User, attributes: ['id', 'username'] }] }
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
};

// Create a new post
exports.createPost = async (req, res) => {
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
        // Scheduled Collaboration: a Repository Request automatically spawns
        // a private group (named after the repo) with the poster as ADMIN.
        // Joiners are added to this group in repoRequest.js's /join route.
        if (category === 'REPO_REQUEST') {
            let groupName = repo_name.trim();
            let suffix = 2;
            while (await Group.findOne({ where: { name: groupName } })) {
                groupName = `${repo_name.trim()} (${suffix})`;
                suffix++;
            }

            const group = await Group.create({
                name: groupName,
                description: 'repository',
                is_private: true
            });

            await GroupMember.create({
                UserId: req.user.id,
                GroupId: group.id,
                role: 'ADMIN',
                status: 'APPROVED'
            });

            newPost.RepoGroupId = group.id;
            await newPost.save();
        }


        const postWithUser = await Post.findByPk(newPost.id, {
            include: [
                { model: User, attributes: ['username', 'profile_picture'] },
                { model: Group, as: 'RepoGroup', attributes: ['id', 'name'] }
            ]
        });

        res.status(201).json(postWithUser);
    } catch (error) {
        console.error("Error creating post:", error);
        res.status(500).json({ error: 'Failed to create post' });
    }
};


// Upvote / Downvote
exports.votePost = async (req, res) => {
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
};

// Create a comment
exports.createComment = async (req, res) => {
    try {
        const { postId } = req.params;
        const { text_content, code_snippet, ParentId } = req.body; 

        const newComment = await Comment.create({
            text_content,
            code_snippet: code_snippet || null,
            UserId: req.user.id,
            PostId: postId,
            ParentId: ParentId || null 
        });

        res.status(201).json(newComment);
    } catch (error) {
        console.error("Error posting comment:", error);
        res.status(500).json({ error: 'Failed to post comment' });
    }
};

// Create an inline line comment on a Peer Review post's code snippet
exports.createCodeComment = async (req, res) => {
    try {
        const { postId } = req.params;
        const { line_number, text_content } = req.body;

        if (!line_number || !text_content || !text_content.trim()) {
            return res.status(400).json({ error: 'A line number and comment text are required' });
        }

        const post = await Post.findByPk(postId);
        if (!post) return res.status(404).json({ error: 'Post not found' });
        if (post.category !== 'PEER_REVIEW') {
            return res.status(400).json({ error: 'Inline code comments are only available on Peer Review posts' });
        }
        if (!post.code_snippet) {
            return res.status(400).json({ error: 'This post has no code snippet to comment on' });
        }

        const codeComment = await CodeComment.create({
            line_number: Number(line_number),
            text_content: text_content.trim(),
            UserId: req.user.id,
            PostId: postId
        });

        const codeCommentWithUser = await CodeComment.findByPk(codeComment.id, {
            include: [{ model: User, attributes: ['id', 'username'] }]
        });

        res.status(201).json(codeCommentWithUser);
    } catch (error) {
        console.error("Error posting code comment:", error);
        res.status(500).json({ error: 'Failed to post code comment' });
    }
};

// Delete a comment
exports.deleteComment = async (req, res) => {
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
};

// ---------------------------------------------------------------
// Q&A Moderation: mark the best answer among a post's comments
// (post author only, one best answer at a time — marking a new one
// unmarks any previous one)
// ---------------------------------------------------------------
exports.markBestAnswer = async (req, res) => {
    try {
        const { postId, commentId } = req.params;

        const post = await Post.findByPk(postId);
        if (!post) return res.status(404).json({ error: 'Post not found' });
        if (post.UserId !== req.user.id) {
            return res.status(403).json({ error: 'Only the post author can mark a best answer' });
        }

        const comment = await Comment.findOne({ where: { id: commentId, PostId: postId } });
        if (!comment) return res.status(404).json({ error: 'Comment not found' });

        if (comment.is_best_answer) {
            // Toggling off
            comment.is_best_answer = false;
            await comment.save();
            return res.json({ message: 'Best answer unmarked', comment });
        }

        // Unmark any previous best answer on this post, then mark the new one
        await Comment.update({ is_best_answer: false }, { where: { PostId: postId, is_best_answer: true } });
        comment.is_best_answer = true;
        await comment.save();

        res.json({ message: 'Best answer marked', comment });
    } catch (error) {
        console.error('Error marking best answer:', error);
        res.status(500).json({ error: 'Failed to mark best answer' });
    }
};

// ---------------------------------------------------------------
// Q&A Moderation: flag / dismiss a post as a duplicate of another
// ---------------------------------------------------------------
exports.flagDuplicate = async (req, res) => {
    try {
        const { postId } = req.params;
        const { duplicate_of_post_id } = req.body;

        if (!duplicate_of_post_id) {
            return res.status(400).json({ error: 'duplicate_of_post_id is required' });
        }
        if (Number(duplicate_of_post_id) === Number(postId)) {
            return res.status(400).json({ error: 'A post cannot be a duplicate of itself' });
        }

        const post = await Post.findByPk(postId);
        if (!post) return res.status(404).json({ error: 'Post not found' });

        const original = await Post.findByPk(duplicate_of_post_id);
        if (!original) return res.status(404).json({ error: 'The referenced original post was not found' });

        post.DuplicateOfPostId = duplicate_of_post_id;
        await post.save();

        res.json({ message: 'Post flagged as duplicate', DuplicateOfPostId: post.DuplicateOfPostId });
    } catch (error) {
        console.error('Error flagging duplicate:', error);
        res.status(500).json({ error: 'Failed to flag as duplicate' });
    }
};

exports.dismissDuplicateFlag = async (req, res) => {
    try {
        const post = await Post.findByPk(req.params.postId);
        if (!post) return res.status(404).json({ error: 'Post not found' });
        if (post.UserId !== req.user.id) {
            return res.status(403).json({ error: 'Only the post author can dismiss this flag' });
        }

        post.DuplicateOfPostId = null;
        await post.save();

        res.json({ message: 'Duplicate flag dismissed' });
    } catch (error) {
        console.error('Error dismissing duplicate flag:', error);
        res.status(500).json({ error: 'Failed to dismiss flag' });
    }
};

// ---------------------------------------------------------------
// Q&A Moderation: AI-assisted best-answer suggestion (post author
// only). Suggests a comment — does NOT mark it automatically, the
// author still confirms via the best-answer endpoint above.
// ---------------------------------------------------------------
const MAX_ANSWERS_IN_PROMPT = 10;
const MAX_ANSWER_CHARS = 400;

exports.suggestBestAnswer = async (req, res) => {
    try {
        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({ error: 'AI suggestion is not configured on the server.' });
        }

        const { postId } = req.params;
        const post = await Post.findByPk(postId);
        if (!post) return res.status(404).json({ error: 'Post not found' });
        if (post.UserId !== req.user.id) {
            return res.status(403).json({ error: 'Only the post author can request a best-answer suggestion' });
        }

        // Only top-level answers are candidates — replies are discussion, not answers
        const answers = await Comment.findAll({
            where: { PostId: postId, ParentId: null, is_deleted: false },
            include: [{ model: User, attributes: ['username'] }],
            order: [['createdAt', 'ASC']],
            limit: MAX_ANSWERS_IN_PROMPT
        });

        if (answers.length === 0) {
            return res.status(400).json({ error: 'There are no answers to choose from yet.' });
        }

        const answerLines = answers
            .map((a, i) => `${i + 1}. (by ${a.User?.username}): ${a.text_content.slice(0, MAX_ANSWER_CHARS)}`)
            .join('\n');

        const promptText =
            `Question: ${post.text_content.slice(0, 500)}\n\n` +
            `Candidate answers:\n${answerLines}\n\n` +
            `Which numbered answer best solves the question? Reply with ONLY the number, ` +
            `then a dash, then a one-sentence reason. Example: "2 - It directly fixes the null check bug."`;

        const aiResponse = await fetch(
            'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': process.env.GEMINI_API_KEY
                },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: promptText }] }],
                    generationConfig: { maxOutputTokens: 100 }
                })
            }
        );

        if (!aiResponse.ok) {
            const errText = await aiResponse.text();
            console.error('AI suggestion error:', errText);
            return res.status(502).json({ error: 'Failed to get a suggestion from the AI service.' });
        }

        const data = await aiResponse.json();
        const raw = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (!raw) return res.status(502).json({ error: 'The AI service returned an empty response.' });

        const match = raw.match(/^(\d+)\s*-?\s*(.*)$/s);
        const index = match ? parseInt(match[1], 10) - 1 : -1;
        const reason = match ? match[2].trim() : raw;

        if (index < 0 || index >= answers.length) {
            return res.status(502).json({ error: 'Could not parse a suggestion from the AI response.' });
        }

        res.json({
            suggested_comment_id: answers[index].id,
            suggested_username: answers[index].User?.username,
            reason
        });
    } catch (error) {
        console.error('Error suggesting best answer:', error);
        res.status(500).json({ error: 'Failed to get a suggestion' });
    }
};