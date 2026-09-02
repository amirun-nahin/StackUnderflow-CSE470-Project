const Meeting = require('../models/Meeting');
const GroupMember = require('../models/GroupMember');
const User = require('../models/User');

// Only these roles may schedule a meeting for the group
const SCHEDULING_ROLES = ['ADMIN', 'TEAM_MANAGER', 'SCRUM_MASTER'];

// ---------------------------------------------------------------
// GET a group's meetings (any approved member — feeds the calendar)
// ---------------------------------------------------------------
exports.getMeetings = async (req, res) => {
    try {
        const member = await GroupMember.findOne({
            where: { GroupId: req.params.groupId, UserId: req.user.id, status: 'APPROVED' }
        });
        if (!member) {
            return res.status(403).json({ error: 'You must be a group member to view meetings' });
        }

        const meetings = await Meeting.findAll({
            where: { GroupId: req.params.groupId },
            include: [{ model: User, as: 'ScheduledBy', attributes: ['id', 'username'] }],
            order: [['scheduled_at', 'ASC']]
        });

        res.json(meetings);
    } catch (error) {
        console.error('Error fetching meetings:', error);
        res.status(500).json({ error: 'Failed to fetch meetings' });
    }
};

// ---------------------------------------------------------------
// POST schedule a new meeting (admin / team manager / scrum master only)
// ---------------------------------------------------------------
exports.scheduleMeeting = async (req, res) => {
    try {
        const { description, scheduled_at } = req.body;
        if (!description || !description.trim() || !scheduled_at) {
            return res.status(400).json({ error: 'A description and scheduled time are required' });
        }

        const member = await GroupMember.findOne({
            where: { GroupId: req.params.groupId, UserId: req.user.id, status: 'APPROVED' }
        });
        if (!member || !SCHEDULING_ROLES.includes(member.role)) {
            return res.status(403).json({ error: 'Only the admin, team manager, or scrum master can schedule meetings' });
        }

        const meeting = await Meeting.create({
            description: description.trim(),
            scheduled_at,
            GroupId: req.params.groupId,
            ScheduledByUserId: req.user.id
        });

        const meetingWithUser = await Meeting.findByPk(meeting.id, {
            include: [{ model: User, as: 'ScheduledBy', attributes: ['id', 'username'] }]
        });

        res.status(201).json(meetingWithUser);
    } catch (error) {
        console.error('Error scheduling meeting:', error);
        res.status(500).json({ error: 'Failed to schedule meeting' });
    }
};