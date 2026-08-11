const express = require('express');
const router = express.Router();
const SavedNews = require('../models/SavedNews');
const User = require('../models/User');
const { validateToken } = require('../middlewares/AuthMiddleware');

// Fetch personalized tech news 
router.get('/', validateToken, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        let tag = 'programming';

        if (user?.primary_language) {
            tag = user.primary_language.toLowerCase().replace(/[^a-z0-9]/g, '');
        } else if (user?.tech_stack && Array.isArray(user.tech_stack) && user.tech_stack.length > 0) {
            tag = user.tech_stack[0].toLowerCase().replace(/[^a-z0-9]/g, '');
        }

        const response = await fetch(`https://dev.to/api/articles?tag=${tag}&per_page=15`);
        if (!response.ok) throw new Error('External API error');
        
        const articles = await response.json();

        const savedNews = await SavedNews.findAll({
            where: { UserId: req.user.id },
            attributes: ['url', 'id']
        });
        const savedUrlMap = new Map(savedNews.map(s => [s.url, s.id]));

        const formattedArticles = articles.map(art => ({
            external_id: art.id,
            title: art.title,
            url: art.url,
            source: art.user?.name || 'Dev.to',
            tag: tag,
            savedId: savedUrlMap.get(art.url) || null,
            isBookmarked: savedUrlMap.has(art.url)
        }));

        res.json({ tag, articles: formattedArticles });
    } catch (error) {
        console.error('Error fetching tech news:', error);
        res.status(500).json({ error: 'Failed to fetch news' });
    }
});

// Bookmark / Save News Link
router.post('/bookmark', validateToken, async (req, res) => {
    try {
        const { title, url, source, external_id } = req.body;
        if (!title || !url || !external_id) return res.status(400).json({ error: 'Missing required fields' });

        const [bookmark, created] = await SavedNews.findOrCreate({
            where: { UserId: req.user.id, url },
            defaults: { title, url, source: source || 'Dev.to', external_id }
        });

        if (!created) {
            await bookmark.destroy();
            return res.json({ message: 'Bookmark removed', isBookmarked: false, savedId: null });
        }

        res.status(201).json({ message: 'Bookmarked successfully', isBookmarked: true, savedId: bookmark.id });
    } catch (error) {
        console.error('Error saving news:', error);
        res.status(500).json({ error: 'Failed to bookmark news' });
    }
});

// Get User's Saved News
router.get('/bookmarks', validateToken, async (req, res) => {
    try {
        const bookmarks = await SavedNews.findAll({
            where: { UserId: req.user.id },
            order: [['createdAt', 'DESC']]
        });
        res.json(bookmarks);
    } catch (error) {
        console.error('Error fetching bookmarks:', error);
        res.status(500).json({ error: 'Failed to fetch saved news' });
    }
});

// Fetch full article HTML by ID
router.get('/article/:id', validateToken, async (req, res) => {
    try {
        const response = await fetch(`https://dev.to/api/articles/${req.params.id}`);
        if (!response.ok) throw new Error('Article not found');
        const article = await response.json();
        res.json(article);
    } catch (error) {
        console.error('Error fetching article:', error);
        res.status(500).json({ error: 'Failed to fetch article' });
    }
});

module.exports = router;