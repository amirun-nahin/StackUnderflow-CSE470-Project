const express = require('express');
const router = express.Router();
const Portfolio = require('../models/Portfolio');
const PortfolioItem = require('../models/PortfolioItem');
const User = require('../models/User');
const { validateToken } = require('../middlewares/AuthMiddleware');

// --- Token-saving measures for AI generation ---
// 1. Generation only ever happens on an explicit user click, never automatically.
// 2. A cooldown blocks rapid repeat calls (and repeat billing) from one user.
// 3. Only a small, capped number of short items are sent in the prompt —
//    never the user's full post/activity history.
// 4. max_tokens on the request itself is still capped (not unlimited),
//    it's just sized for a real paragraph instead of a one-liner.
const GENERATE_COOLDOWN_MS = 60 * 1000;
const MAX_ITEMS_IN_PROMPT = 10;
const MAX_DESC_CHARS = 150;

const VALID_TEMPLATES = ['MINIMAL', 'MODERN', 'CLASSIC'];
const VALID_TYPES = ['PROJECT', 'SKILL', 'ACHIEVEMENT', 'EXPERIENCE', 'CUSTOM'];

async function getOrCreatePortfolio(userId) {
    let portfolio = await Portfolio.findOne({ where: { UserId: userId } });
    if (!portfolio) {
        portfolio = await Portfolio.create({ UserId: userId });
    }
    return portfolio;
}

// ---------------------------------------------------------------
// Own portfolio management — registered before the /:username
// route below so "me" is never mistaken for a username.
// ---------------------------------------------------------------

// Update template choice and/or manually edit the headline
router.put('/me', validateToken, async (req, res) => {
    try {
        const { template, headline } = req.body;

        if (template !== undefined && !VALID_TEMPLATES.includes(template)) {
            return res.status(400).json({ error: 'Invalid template' });
        }

        const portfolio = await getOrCreatePortfolio(req.user.id);
        if (template !== undefined) portfolio.template = template;
        if (headline !== undefined) portfolio.headline = headline;
        await portfolio.save();

        res.json(portfolio);
    } catch (error) {
        console.error('Error updating portfolio:', error);
        res.status(500).json({ error: 'Failed to update portfolio' });
    }
});

// Add an item
router.post('/me/items', validateToken, async (req, res) => {
    try {
        const { type, title, description } = req.body;

        if (!title || !title.trim()) {
            return res.status(400).json({ error: 'Title is required' });
        }
        if (type !== undefined && !VALID_TYPES.includes(type)) {
            return res.status(400).json({ error: 'Invalid item type' });
        }

        const portfolio = await getOrCreatePortfolio(req.user.id);
        const count = await PortfolioItem.count({ where: { PortfolioId: portfolio.id } });

        const item = await PortfolioItem.create({
            type: type || 'CUSTOM',
            title: title.trim(),
            description: description ? description.trim() : null,
            order: count,
            PortfolioId: portfolio.id
        });

        res.status(201).json(item);
    } catch (error) {
        console.error('Error adding portfolio item:', error);
        res.status(500).json({ error: 'Failed to add item' });
    }
});

// Remove an item
router.delete('/me/items/:itemId', validateToken, async (req, res) => {
    try {
        const portfolio = await getOrCreatePortfolio(req.user.id);
        const item = await PortfolioItem.findOne({
            where: { id: req.params.itemId, PortfolioId: portfolio.id }
        });
        if (!item) return res.status(404).json({ error: 'Item not found' });

        await item.destroy();
        res.json({ message: 'Item removed' });
    } catch (error) {
        console.error('Error removing portfolio item:', error);
        res.status(500).json({ error: 'Failed to remove item' });
    }
});

// ---------------------------------------------------------------
// AI headline generation — Google AI Studio / Gemini API
// ---------------------------------------------------------------
router.post('/me/generate', validateToken, async (req, res) => {
    try {
        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({ error: 'AI generation is not configured on the server.' });
        }

        const portfolio = await getOrCreatePortfolio(req.user.id);

        if (portfolio.last_generated_at) {
            const elapsed = Date.now() - new Date(portfolio.last_generated_at).getTime();
            if (elapsed < GENERATE_COOLDOWN_MS) {
                const waitSeconds = Math.ceil((GENERATE_COOLDOWN_MS - elapsed) / 1000);
                return res.status(429).json({ error: `Please wait ${waitSeconds}s before regenerating again.` });
            }
        }

        const items = await PortfolioItem.findAll({
            where: { PortfolioId: portfolio.id },
            order: [['order', 'ASC']],
            limit: MAX_ITEMS_IN_PROMPT
        });

        if (items.length === 0) {
            return res.status(400).json({ error: 'Add at least one item to your portfolio before generating a headline.' });
        }

        const user = await User.findByPk(req.user.id, {
            attributes: ['username', 'name', 'current_role', 'tech_stack']
        });

        const techStack = Array.isArray(user.tech_stack) ? user.tech_stack.join(', ') : (user.tech_stack || 'N/A');
        const highlightLines = items
            .map((item) => `- (${item.type}) ${item.title}${item.description ? ': ' + item.description.slice(0, MAX_DESC_CHARS) : ''}`)
            .join('\n');

        const promptText =
            `Name: ${user.name || user.username}\n` +
            `Role: ${user.current_role || 'Developer'}\n` +
            `Tech stack: ${techStack}\n\n` +
            `Portfolio highlights:\n${highlightLines}\n\n` +
            `Write an engaging professional portfolio summary (2 short paragraphs, plain text only, no markdown, no headers) based on the above. Cover their background, standout highlights from the list, and what they're focused on now.`;

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
                    generationConfig: { maxOutputTokens: 700 }
                })
            }
        );

        if (!aiResponse.ok) {
            const errText = await aiResponse.text();
            console.error('AI generation error:', errText);
            return res.status(502).json({ error: 'Failed to generate headline from the AI service.' });
        }

        const data = await aiResponse.json();
        const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

        if (!generatedText) {
            return res.status(502).json({ error: 'The AI service returned an empty response.' });
        }

        portfolio.headline = generatedText;
        portfolio.last_generated_at = new Date();
        await portfolio.save();

        res.json(portfolio);
    } catch (error) {
        console.error('Error generating portfolio headline:', error);
        res.status(500).json({ error: 'Failed to generate headline' });
    }
});

// ---------------------------------------------------------------
// Public view of a portfolio by username
// ---------------------------------------------------------------
router.get('/:username', async (req, res) => {
    try {
        const user = await User.findOne({ where: { username: req.params.username } });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const portfolio = await Portfolio.findOne({
            where: { UserId: user.id },
            include: [{ model: PortfolioItem, separate: true, order: [['order', 'ASC']] }]
        });

        if (!portfolio) {
            return res.json({ template: 'MINIMAL', headline: null, PortfolioItems: [], username: user.username });
        }

        res.json({ ...portfolio.toJSON(), username: user.username });
    } catch (error) {
        console.error('Error fetching portfolio:', error);
        res.status(500).json({ error: 'Failed to fetch portfolio' });
    }
});

module.exports = router;