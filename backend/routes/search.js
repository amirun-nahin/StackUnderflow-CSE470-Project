const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const sequelize = require('../config/db');
const Post = require('../models/Post');
const User = require('../models/User');
const Competition = require('../models/Competition');
const Group = require('../models/Group');
const GroupMember = require('../models/GroupMember');
const Message = require('../models/Message');
const { validateToken } = require('../middlewares/AuthMiddleware');

const RESULT_LIMIT = 20;

// Loosely parses a search string as a date (e.g. "2026-08-14", "08/14/2026").
// Returns a plain 'YYYY-MM-DD' string on success, or null if it isn't a date.
function parseDateLoose(str) {
    if (!str || !/\d/.test(str)) return null;
    const parsed = new Date(str);
    if (isNaN(parsed.getTime())) return null;
    return parsed.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------
// GET /api/search?type=post|user|competition&q=<text>&tag=<tag>
// ---------------------------------------------------------------
router.get('/', validateToken, async (req, res) => {
    try {
        const type = req.query.type || 'post';
        const query = (req.query.q || '').trim();
        const tag = (req.query.tag || '').trim();

        if (!query && !tag) {
            return res.json({ results: [] });
        }

        const asDate = parseDateLoose(query);

        // -------------------- Users --------------------
        if (type === 'user') {
            const users = await User.findAll({
                where: query ? { username: { [Op.like]: `%${query}%` } } : {},
                attributes: ['id', 'username', 'name', 'profile_picture'],
                limit: RESULT_LIMIT
            });
            return res.json({
                results: users.map(u => ({
                    type: 'user',
                    id: u.id,
                    username: u.username,
                    name: u.name,
                    profile_picture: u.profile_picture
                }))
            });
        }

        // -------------------- Competitions --------------------
        if (type === 'competition') {
            const andParts = [];
            if (tag) {
                andParts.push({ language: { [Op.like]: `%${tag}%` } });
            }
            if (query) {
                const orConditions = [
                    { title: { [Op.like]: `%${query}%` } },
                    { description: { [Op.like]: `%${query}%` } }
                ];
                if (asDate) {
                    orConditions.push(sequelize.where(sequelize.fn('DATE', sequelize.col('start_time')), asDate));
                }
                andParts.push({ [Op.or]: orConditions });
            }

            const competitions = await Competition.findAll({
                where: andParts.length ? { [Op.and]: andParts } : {},
                order: [['start_time', 'DESC']],
                limit: RESULT_LIMIT
            });

            return res.json({
                results: competitions.map(c => ({
                    type: 'competition',
                    id: c.id,
                    title: c.title,
                    description: c.description,
                    language: c.language,
                    start_time: c.start_time
                }))
            });
        }
        // -------------------- Groups --------------------
        if (type === 'group') {
            const groups = await Group.findAll({
                where: query ? {
                    [Op.or]: [
                        { name: { [Op.like]: `%${query}%` } },
                        { description: { [Op.like]: `%${query}%` } }
                    ]
                } : {},
                order: [['name', 'ASC']],
                limit: RESULT_LIMIT
            });

            return res.json({
                results: groups.map(g => ({
                    type: 'group',
                    id: g.id,
                    name: g.name,
                    description: g.description,
                    is_private: g.is_private
                }))
            });
        }

        // -------------------- Messages (your own conversations only) --------------------
        if (type === 'message') {
            const myId = req.user.id;
            const andParts = [{ [Op.or]: [{ SenderId: myId }, { ReceiverId: myId }] }];

            if (query) {
                const orConditions = [
                    { text_content: { [Op.like]: `%${query}%` } },
                    { '$Sender.username$': { [Op.like]: `%${query}%` } },
                    { '$Receiver.username$': { [Op.like]: `%${query}%` } }
                ];
                if (asDate) {
                    orConditions.push(sequelize.where(sequelize.fn('DATE', sequelize.col('Message.createdAt')), asDate));
                }
                andParts.push({ [Op.or]: orConditions });
            }

            const messages = await Message.findAll({
                subQuery: false,
                where: { [Op.and]: andParts },
                include: [
                    { model: User, as: 'Sender', attributes: ['id', 'username'] },
                    { model: User, as: 'Receiver', attributes: ['id', 'username'] }
                ],
                order: [['createdAt', 'DESC']],
                limit: RESULT_LIMIT
            });

            return res.json({
                results: messages.map(m => {
                    const otherUser = m.SenderId === myId ? m.Receiver : m.Sender;
                    return {
                        type: 'message',
                        id: m.id,
                        text_content: m.text_content,
                        createdAt: m.createdAt,
                        otherUserId: otherUser?.id,
                        otherUsername: otherUser?.username
                    };
                })
            });
        }

        // -------------------- Posts (default) --------------------
        // Visible posts are: ungrouped posts, posts in public groups, and posts
        // in private groups this user is an approved member of.
        const [publicGroups, myMemberships] = await Promise.all([
            Group.findAll({ where: { is_private: false }, attributes: ['id'] }),
            GroupMember.findAll({ where: { UserId: req.user.id, status: 'APPROVED' }, attributes: ['GroupId'] })
        ]);
        const visibleGroupIds = [
            ...publicGroups.map(g => g.id),
            ...myMemberships.map(m => m.GroupId)
        ];


        // -------------------- Posts (default) --------------------
        const andParts = [];
        if (tag) {
            andParts.push({
                [Op.or]: [
                    { category: { [Op.like]: `%${tag.toUpperCase()}%` } },
                    { language: { [Op.like]: `%${tag}%` } }
                ]
            });
        }
        if (query) {
            const orConditions = [
                { text_content: { [Op.like]: `%${query}%` } },
                { '$User.username$': { [Op.like]: `%${query}%` } }
            ];
            if (asDate) {
                orConditions.push(sequelize.where(sequelize.fn('DATE', sequelize.col('Post.createdAt')), asDate));
            }
            andParts.push({ [Op.or]: orConditions });
        }

        const posts = await Post.findAll({
            subQuery: false,
            where: {
                [Op.or]: [
                    { GroupId: null },
                    { GroupId: { [Op.in]: visibleGroupIds } }
                ],
                ...(andParts.length ? { [Op.and]: andParts } : {})
            },
            include: [{ model: User, attributes: ['id', 'username', 'profile_picture'] }],
            order: [['createdAt', 'DESC']],
            limit: RESULT_LIMIT
        });

        res.json({
            results: posts.map(p => ({
                type: 'post',
                id: p.id,
                text_content: p.text_content,
                category: p.category,
                username: p.User?.username,
                createdAt: p.createdAt
            }))
        });
    } catch (error) {
        console.error('Error performing search:', error);
        res.status(500).json({ error: 'Search failed' });
    }
});

module.exports = router;