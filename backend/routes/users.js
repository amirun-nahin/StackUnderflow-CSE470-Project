const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Post = require('../models/Post');
const RepoRequestJoin = require('../models/RepoRequestJoin');
const BountyEnrollment = require('../models/BountyEnrollment');
const BountySubmission = require('../models/BountySubmission');
const Competition = require('../models/Competition');
const Vote = require('../models/Vote');
const Comment = require('../models/Comment');
const CompetitionSubmission = require('../models/CompetitionSubmission');
const { validateToken } = require('../middlewares/AuthMiddleware');


// Get all the users (for discover page)
router.get('/', validateToken, async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: ['id', 'username', 'name', 'current_role', 'profile_picture'],
            include: [{ model: User, as: 'Followers', attributes: ['id', 'username'] }]
        });
        res.json(users);
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Get Profile (Now includes Posts, Followers, and Following)
router.get('/:username', validateToken, async (req, res) => {
    try {
        const user = await User.findOne({ 
            where: { username: req.params.username },
            attributes: { exclude: ['password', 'github_access_token'] },
            include: [
                { 
                    model: Post , 
                    include: [
                        {model: Vote}, {model: Comment}, 
                        {model: RepoRequestJoin, 
                            include: [{ model: User, attributes: ['id', 'username', 'profile_picture'] }]}]
                },
                {
                    model: BountyEnrollment,
                    include: [{ model: Post, attributes: ['id', 'text_content', 'category', 'bounty_status'] }]
                },
                {
                    model: BountySubmission,
                    include: [{ model: Post, attributes: ['id', 'text_content'] }]
                },
                {
                    model: Competition,
                    attributes: ['id', 'title', 'language', 'start_time', 'duration_minutes']
                },
                {
                    model: CompetitionSubmission,
                    include: [{ model: Competition, attributes: ['id', 'title', 'language'] }]
                }
            ],
            
            // Properly order the included posts from newest to oldest
            order: [[Post, 'createdAt', 'DESC']]
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' })
        };
        res.json(user);
    } catch (error) {
        console.error("Error fetching profile:", error);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

// Toggle Follow / Unfollow
router.post('/:username/follow', validateToken, async (req, res) => {
    try {
        // Find the user we want to follow
        const targetUser = await User.findOne({ where: { username: req.params.username } });
        
        // Find the person clicking the button (the logged-in user)
        const currentUser = await User.findByPk(req.user.id);

        if (!targetUser) {
            return res.status(404).json({ error: 'User not found' })
        };
        if (targetUser.id === currentUser.id) {
            return res.status(400).json({ error: 'You cannot follow yourself' })
        };

        // Check if a relationship already exists
        const isCurrentlyFollowing = await currentUser.hasFollowing(targetUser);

        if (isCurrentlyFollowing) {
            // Unfollow
            await currentUser.removeFollowing(targetUser);
            res.json({ message: 'Unfollowed successfully', isFollowing: false });
        } else {
            // Follow
            await currentUser.addFollowing(targetUser);
            res.json({ message: 'Followed successfully', isFollowing: true });
        }
    } catch (error) {
        console.error("Follow error:", error);
        res.status(500).json({ error: 'Failed to toggle follow status' });
    }
});

// Update Profile
router.put('/update', validateToken, async (req, res) => {
    try {
        const { 
            birthdate, address, github_profile, bio, field_of_interest,
            tech_stack, current_role, years_of_experience, availability_status,
            social_media_links
        } = req.body;
        
        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' })
        };

        if (birthdate !== undefined) user.birthdate = birthdate;
        if (address !== undefined) user.address = address;
        if (github_profile !== undefined) user.github_profile = github_profile;
        if (bio !== undefined) user.bio = bio;
        if (field_of_interest !== undefined) user.field_of_interest = field_of_interest;
        if (tech_stack !== undefined) user.tech_stack = tech_stack;
        if (current_role !== undefined) user.current_role = current_role;
        if (years_of_experience !== undefined) user.years_of_experience = years_of_experience;
        if (availability_status !== undefined) user.availability_status = availability_status;
        if (social_media_links !== undefined) user.social_media_links = social_media_links;

        await user.save();
        const { password, ...safeUser } = user.toJSON();
        res.json({ message: 'Profile updated successfully', user: safeUser });
    } catch (error) {
        console.error("Error updating profile:", error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

module.exports = router;