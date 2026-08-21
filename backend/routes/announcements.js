const express = require('express');
const router = express.Router();
const Announcement = require('../models/Announcement');
const GroupMember = require('../models/GroupMember');
const User = require('../models/User');
const { validateToken } = require('../middlewares/AuthMiddleware');

// Only these roles may post announcements to the group
const ANNOUNCEMENT_ROLES = ['ADMIN', 'TEAM_MANAGER', 'SCRUM_MASTER'];

// ---------------------------------------------------------------
// GET a group's announcements (any approved member)
// ---------------------------------------------------------------
router.get('/:groupId/announcements', validateToken, async (req, res) => {
    try {
        const member = await GroupMember.findOne({
            where: { GroupId: req.params.groupId, UserId: req.user.id, status: 'APPROVED' }
        });
        if (!member) {
            return res.status(403).json({ error: 'You must be a group member to view announcements' });
        }

        const announcements = await Announcement.findAll({
            where: { GroupId: req.params.groupId },
            include: [{ model: User, attributes: ['id', 'username', 'profile_picture'] }],
            order: [['createdAt', 'DESC']]
        });

        res.json(announcements);
    } catch (error) {
        console.error('Error fetching announcements:', error);
        res.status(500).json({ error: 'Failed to fetch announcements' });
    }
});

// ---------------------------------------------------------------
// POST a new announcement (admin / team manager / scrum master only)
// ---------------------------------------------------------------
router.post('/:groupId/announcements', validateToken, async (req, res) => {
    try {
        const { text_content } = req.body;
        if (!text_content || !text_content.trim()) {
            return res.status(400).json({ error: 'Announcement text is required' });
        }

        const member = await GroupMember.findOne({
            where: { GroupId: req.params.groupId, UserId: req.user.id, status: 'APPROVED' }
        });
        if (!member || !ANNOUNCEMENT_ROLES.includes(member.role)) {
            return res.status(403).json({ error: 'Only the admin, team manager, or scrum master can post announcements' });
        }

        const announcement = await Announcement.create({
            text_content: text_content.trim(),
            GroupId: req.params.groupId,
            UserId: req.user.id
        });

        const announcementWithUser = await Announcement.findByPk(announcement.id, {
            include: [{ model: User, attributes: ['id', 'username', 'profile_picture'] }]
        });

        res.status(201).json(announcementWithUser);
    } catch (error) {
        console.error('Error posting announcement:', error);
        res.status(500).json({ error: 'Failed to post announcement' });
    }
});

module.exports = router;
