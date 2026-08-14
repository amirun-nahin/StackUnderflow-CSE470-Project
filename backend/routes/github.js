const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { validateToken } = require('../middlewares/AuthMiddleware');

// Note: GitHub retired username/password login for third-party apps years ago.
// The supported way for an app like this to act on a user's behalf without a
// full OAuth App registration is a Personal Access Token (PAT), so "connecting"
// here means: username + PAT, verified directly against the GitHub API.

// ---------------------------------------------------------------
// GET connection status
// ---------------------------------------------------------------
router.get('/status', validateToken, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        res.json({
            connected: !!user.github_access_token,
            github_username: user.github_username || null
        });
    } catch (error) {
        console.error('Error fetching GitHub status:', error);
        res.status(500).json({ error: 'Failed to fetch GitHub status' });
    }
});

// ---------------------------------------------------------------
// Connect a GitHub account (username + Personal Access Token)
// ---------------------------------------------------------------
router.post('/connect', validateToken, async (req, res) => {
    try {
        const { github_username, access_token } = req.body;

        if (!github_username || !access_token) {
            return res.status(400).json({ error: 'GitHub username and access token are required' });
        }

        // Verify the token actually works and belongs to that username
        const ghResponse = await fetch('https://api.github.com/user', {
            headers: {
                'Authorization': `Bearer ${access_token}`,
                'User-Agent': 'StackUnderflow-App'
            }
        });

        if (!ghResponse.ok) {
            return res.status(401).json({ error: 'Invalid GitHub username or access token' });
        }

        const ghUser = await ghResponse.json();
        if (ghUser.login?.toLowerCase() !== github_username.toLowerCase()) {
            return res.status(401).json({ error: 'That access token does not belong to this GitHub username' });
        }

        const user = await User.findByPk(req.user.id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        user.github_username = ghUser.login;
        user.github_access_token = access_token;
        await user.save();

        res.json({ connected: true, github_username: user.github_username });
    } catch (error) {
        console.error('Error connecting GitHub account:', error);
        res.status(500).json({ error: 'Failed to connect GitHub account' });
    }
});

// ---------------------------------------------------------------
// Disconnect the GitHub account
// ---------------------------------------------------------------
router.delete('/disconnect', validateToken, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        user.github_username = null;
        user.github_access_token = null;
        await user.save();

        res.json({ message: 'GitHub account disconnected', connected: false });
    } catch (error) {
        console.error('Error disconnecting GitHub account:', error);
        res.status(500).json({ error: 'Failed to disconnect GitHub account' });
    }
});

// ---------------------------------------------------------------
// List the connected user's own GitHub repositories
// ---------------------------------------------------------------
router.get('/repositories', validateToken, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        if (!user || !user.github_access_token) {
            return res.status(400).json({ error: 'GitHub account is not connected' });
        }

        const ghResponse = await fetch('https://api.github.com/user/repos?sort=updated&per_page=100', {
            headers: {
                'Authorization': `Bearer ${user.github_access_token}`,
                'User-Agent': 'StackUnderflow-App'
            }
        });

        if (!ghResponse.ok) {
            return res.status(502).json({ error: 'Failed to fetch repositories from GitHub' });
        }

        const repos = await ghResponse.json();

        const shaped = repos.map(r => ({
            id: r.id,
            name: r.name,
            full_name: r.full_name,
            description: r.description,
            html_url: r.html_url,
            language: r.language,
            private: r.private,
            stargazers_count: r.stargazers_count,
            forks_count: r.forks_count,
            updated_at: r.updated_at
        }));

        res.json(shaped);
    } catch (error) {
        console.error('Error fetching GitHub repositories:', error);
        res.status(500).json({ error: 'Failed to fetch repositories' });
    }
});

module.exports = router;