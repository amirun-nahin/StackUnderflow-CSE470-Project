const User = require('../models/User');


const jobCache = new Map();
const CACHE_DURATION = 15 * 60 * 1000;

router.get('/', validateToken, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        let tag = 'developer';

        if (user?.primary_language) {
            tag = user.primary_language.toLowerCase().replace(/[^a-z0-9]/g, '');
        } else if (user?.tech_stack && Array.isArray(user.tech_stack) && user.tech_stack.length > 0) {
            tag = user.tech_stack[0].toLowerCase().replace(/[^a-z0-9]/g, '');
        }

        let jobs;

        // Check Cache
        if (jobCache.has(tag) && (Date.now() - jobCache.get(tag).timestamp < CACHE_DURATION)) {
            jobs = jobCache.get(tag).data;
        } else {
            // Fetch from Remotive API
            const response = await fetch(`https://remotive.com/api/remote-jobs?search=${tag}`);
            if (!response.ok) throw new Error('External API error');
            
            const data = await response.json();
            // Slice the array to keep the list short
            jobs = data.jobs ? data.jobs.slice(0, 8) : [];
            
            jobCache.set(tag, { data: jobs, timestamp: Date.now() });
        }

        const formattedJobs = jobs.map(job => ({
            external_id: job.id,
            title: job.title,
            url: job.url,
            company_name: job.company_name || 'Unknown Company',
            tag: tag
        }));

        res.json({ tag, jobs: formattedJobs });
    } catch (error) {
        console.error('Error fetching jobs:', error);
        res.status(500).json({ error: 'Failed to fetch jobs' });
    }
});

module.exports = router;