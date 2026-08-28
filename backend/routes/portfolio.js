const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const Portfolio = require('../models/Portfolio');
const PortfolioItem = require('../models/PortfolioItem');
const Post = require('../models/Post');
const BountyEnrollment = require('../models/BountyEnrollment');
const User = require('../models/User');
const { validateToken } = require('../middlewares/AuthMiddleware');

const VALID_TEMPLATES = ['MINIMAL', 'MODERN', 'CLASSIC'];
const VALID_TYPES = ['PROJECT', 'SKILL', 'ACHIEVEMENT', 'EXPERIENCE', 'CUSTOM'];
const TYPE_LABELS = {
    PROJECT: 'Projects',
    SKILL: 'Skills',
    ACHIEVEMENT: 'Achievements',
    EXPERIENCE: 'Experience',
    CUSTOM: 'More'
};

async function getOrCreatePortfolio(userId) {
    let portfolio = await Portfolio.findOne({ where: { UserId: userId } });
    if (!portfolio) {
        portfolio = await Portfolio.create({ UserId: userId });
    }
    return portfolio;
}

// ---------------------------------------------------------------
// Own portfolio management — registered before /:username below
// so "me" is never mistaken for a username.
// ---------------------------------------------------------------

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
// View a portfolio's data (JSON) by username — public
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

// ---------------------------------------------------------------
// Generate the portfolio as a PDF — entirely local, no external API,
// so this costs nothing and can be regenerated freely.
// ---------------------------------------------------------------
router.get('/:username/pdf', async (req, res) => {
    try {
        const user = await User.findOne({ where: { username: req.params.username } });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const portfolio = await Portfolio.findOne({ where: { UserId: user.id } });
        const template = (req.query.template || portfolio?.template || 'MINIMAL').toUpperCase();
        if (!VALID_TEMPLATES.includes(template)) {
            return res.status(400).json({ error: 'Invalid template' });
        }

        const items = portfolio
            ? await PortfolioItem.findAll({ where: { PortfolioId: portfolio.id }, order: [['order', 'ASC']] })
            : [];

        const [postCount, completedBounties, followerCount] = await Promise.all([
            Post.count({ where: { UserId: user.id } }),
            BountyEnrollment.count({ where: { UserId: user.id, status: 'COMPLETED' } }),
            user.countFollowers()
        ]);

        const stats = { points: user.points || 0, posts: postCount, bounties: completedBounties, followers: followerCount };
        const techStack = Array.isArray(user.tech_stack) ? user.tech_stack : [];

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${user.username}-portfolio.pdf"`);

        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        doc.pipe(res);

        renderTemplate(doc, template, { user, headline: portfolio?.headline, techStack, stats, items });

        doc.end();
    } catch (error) {
        console.error('Error generating portfolio PDF:', error);
        res.status(500).json({ error: 'Failed to generate PDF' });
    }
});

// ---------------------------------------------------------------
// PDF rendering — one function per template style
// ---------------------------------------------------------------
function renderTemplate(doc, template, data) {
    if (template === 'MODERN') return renderModern(doc, data);
    if (template === 'CLASSIC') return renderClassic(doc, data);
    return renderMinimal(doc, data);
}

function sectionItems(doc, items) {
    const grouped = {};
    items.forEach((item) => {
        if (!grouped[item.type]) grouped[item.type] = [];
        grouped[item.type].push(item);
    });

    Object.keys(TYPE_LABELS).forEach((type) => {
        if (!grouped[type]) return;
        doc.moveDown(0.8);
        doc.fontSize(13).font('Helvetica-Bold').text(TYPE_LABELS[type]);
        doc.moveDown(0.3);
        grouped[type].forEach((item) => {
            doc.fontSize(11).font('Helvetica-Bold').text(item.title);
            if (item.description) {
                doc.fontSize(10).font('Helvetica').fillColor('#444444').text(item.description);
                doc.fillColor('#000000');
            }
            doc.moveDown(0.4);
        });
    });
}

function renderMinimal(doc, { user, headline, techStack, stats, items }) {
    doc.fontSize(24).font('Helvetica-Bold').text(user.name || user.username);
    doc.fontSize(12).font('Helvetica').fillColor('#555555').text(user.current_role || 'Developer');
    doc.fillColor('#000000');
    if (user.github_profile) {
        doc.fontSize(9).fillColor('#0d9488').text(user.github_profile, { link: user.github_profile });
        doc.fillColor('#000000');
    }
    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#dddddd').stroke();
    doc.moveDown();

    if (headline || user.bio) {
        doc.fontSize(11).font('Helvetica').text(headline || user.bio, { align: 'left' });
        doc.moveDown();
    }

    if (techStack.length > 0) {
        doc.fontSize(10).font('Helvetica-Bold').text('Tech Stack: ', { continued: true });
        doc.font('Helvetica').text(techStack.join(', '));
        doc.moveDown(0.5);
    }

    doc.fontSize(10).font('Helvetica').fillColor('#555555').text(
        `${stats.points} pts   ·   ${stats.posts} posts   ·   ${stats.bounties} bounties completed   ·   ${stats.followers} followers`
    );
    doc.fillColor('#000000');

    sectionItems(doc, items);
}

function renderModern(doc, { user, headline, techStack, stats, items }) {
    doc.rect(0, 0, doc.page.width, 110).fill('#0d9488');
    doc.fillColor('#ffffff').fontSize(26).font('Helvetica-Bold').text(user.name || user.username, 50, 35);
    doc.fontSize(13).font('Helvetica').text(user.current_role || 'Developer', 50, 68);
    doc.fillColor('#000000');
    doc.moveDown(3.5);

    if (headline || user.bio) {
        doc.fontSize(11).font('Helvetica').text(headline || user.bio);
        doc.moveDown();
    }

    if (user.github_profile) {
        doc.fontSize(9).fillColor('#0d9488').text(user.github_profile, { link: user.github_profile });
        doc.fillColor('#000000');
        doc.moveDown(0.5);
    }

    if (techStack.length > 0) {
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#0d9488').text('TECH STACK');
        doc.fillColor('#000000').font('Helvetica').fontSize(10).text(techStack.join('   ·   '));
        doc.moveDown(0.5);
    }

    doc.fontSize(10).font('Helvetica-Bold').fillColor('#0d9488').text('STATS');
    doc.fillColor('#000000').font('Helvetica').fontSize(10).text(
        `${stats.points} pts   ·   ${stats.posts} posts   ·   ${stats.bounties} bounties completed   ·   ${stats.followers} followers`
    );

    sectionItems(doc, items);
}

function renderClassic(doc, { user, headline, techStack, stats, items }) {
    doc.fontSize(22).font('Helvetica-Bold').text(user.name || user.username, { align: 'center' });
    doc.fontSize(12).font('Helvetica').fillColor('#555555').text(user.current_role || 'Developer', { align: 'center' });
    doc.fillColor('#000000');
    if (user.github_profile) {
        doc.fontSize(9).text(user.github_profile, { align: 'center', link: user.github_profile });
    }
    doc.moveDown();
    doc.moveTo(150, doc.y).lineTo(445, doc.y).lineWidth(1.5).strokeColor('#000000').stroke();
    doc.moveDown();

    if (headline || user.bio) {
        doc.fontSize(11).font('Helvetica-Oblique').text(headline || user.bio, { align: 'center' });
        doc.moveDown();
    }

    if (techStack.length > 0) {
        doc.fontSize(10).font('Helvetica').text(techStack.join(' · '), { align: 'center' });
        doc.moveDown(0.5);
    }

    doc.fontSize(10).text(
        `${stats.points} pts   |   ${stats.posts} posts   |   ${stats.bounties} bounties completed   |   ${stats.followers} followers`,
        { align: 'center' }
    );

    sectionItems(doc, items);
}

module.exports = router;