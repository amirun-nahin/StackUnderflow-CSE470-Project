const bcrypt = require('bcrypt');
const sequelize = require('./config/db');

const User = require('./models/User');
const Post = require('./models/Post');
const Comment = require('./models/Comment');
const Vote = require('./models/Vote');
const BountyEnrollment = require('./models/BountyEnrollment');
const BountySubmission = require('./models/BountySubmission');
const Competition = require('./models/Competition');
const CompetitionSubmission = require('./models/CompetitionSubmission');
const Group = require('./models/Group');
const GroupMember = require('./models/GroupMember');
const Message = require('./models/Message');
const SavedNews = require('./models/SavedNews');
const Duel = require('./models/Duel');
const DuelQuestion = require('./models/DuelQuestion');
const DuelSubmission = require('./models/DuelSubmission');
const Notification = require('./models/Notification');
const QuizAttempt = require('./models/QuizAttempt');
const RepoRequestJoin = require('./models/RepoRequestJoin');
const Meeting = require('./models/Meeting');
const Announcement = require('./models/Announcement');
const CodeComment = require('./models/CodeComment');
const Portfolio = require('./models/Portfolio');
const PortfolioItem = require('./models/PortfolioItem');

// Registers every association (User.hasMany(Post), Duel's Challenger/Opponent/
// Winner aliases, etc.) before we touch any of the models above.
require('./index.js');

// ============================================================
// Helpers
// ============================================================
const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];
const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const chance = (probability) => Math.random() < probability;

// Unique random subset of `arr`, size between min and max (inclusive)
const getRandomSubset = (arr, min, max) => {
    const size = Math.min(arr.length, getRandomInt(min, max));
    const pool = [...arr];
    const result = [];
    while (result.length < size) {
        const idx = Math.floor(Math.random() * pool.length);
        result.push(pool.splice(idx, 1)[0]);
    }
    return result;
};

const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
const daysFromNow = (n) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);
const hoursAgo = (n) => new Date(Date.now() - n * 60 * 60 * 1000);

// Weighted pick: pool is an array of [value, weight] pairs
const weightedPick = (pool) => {
    const total = pool.reduce((sum, [, w]) => sum + w, 0);
    let r = Math.random() * total;
    for (const [value, w] of pool) {
        if (r < w) return value;
        r -= w;
    }
    return pool[pool.length - 1][0];
};

// ============================================================
// Content libraries (kept generic / made up — not real projects)
// ============================================================
const FIRST_NAMES = ['Ava', 'Liam', 'Noah', 'Emma', 'Sofia', 'Mateo', 'Yuki', 'Chen', 'Priya', 'Diego',
    'Fatima', 'Kwame', 'Elena', 'Hiro', 'Zoe', 'Omar', 'Ines', 'Lucas', 'Maya', 'Arjun',
    'Nadia', 'Theo', 'Aisha', 'Felix', 'Sana', 'Marco', 'Lena', 'Kofi', 'Rina', 'Tariq',
    'Clara', 'Jonas', 'Mei', 'Dara', 'Alonso', 'Ingrid', 'Ravi', 'Nora', 'Sami', 'Petra',
    'Ezra', 'Amara', 'Viktor', 'Layla', 'Bjorn', 'Sasha', 'Talia', 'Hassan', 'Ines', 'Milo'];
const LAST_NAMES = ['Nakamura', 'Silva', 'Okafor', 'Kowalski', 'Rossi', 'Nguyen', 'Haddad', 'Fischer',
    'Larsson', 'Reyes', 'Petrova', 'Kim', 'Duarte', 'Novak', 'Andersson', 'Osei', 'Moreau',
    'Alvarez', 'Berg', 'Costa', 'Sato', 'Meyer', 'Dubois', 'Ibrahim', 'Volkov', 'Santos',
    'Weber', 'Choudhury', 'Lindgren', 'Park', 'Rahman', 'Ferreira', 'Schulz', 'Adeyemi',
    'Torres', 'Klein', 'Ricci', 'Popescu', 'Hansen', 'Iqbal', 'Braga', 'Wren', 'Castillo'];

const ROLES = ['Frontend Engineer', 'Backend Engineer', 'Full-Stack Engineer', 'DevOps Engineer',
    'Mobile Developer', 'Data Engineer', 'ML Engineer', 'Computer Science Student', 'QA Engineer',
    'Engineering Manager', 'Freelance Developer', 'Solutions Architect', 'Game Developer'];
const COMPANIES_UNIS = ['Northbridge Labs', 'Univ. of Toronto', 'Kestrel Systems', 'MIT', 'Freelance',
    'Delta Cloud', 'TU Munich', 'Rivet Analytics', 'National University of Singapore', 'Outpost Robotics',
    'IIT Bombay', 'Lumen Health Tech', 'ETH Zurich', 'Foundry Software', 'Self-employed'];
const INTERESTS = ['Distributed Systems', 'Machine Learning', 'Web Performance', 'Developer Tools',
    'Cloud Infrastructure', 'Computer Graphics', 'Cybersecurity', 'Compilers', 'Mobile UX',
    'Open Source', 'Robotics', 'Data Visualization', 'Game Engines', 'Embedded Systems'];
const LANGUAGES = ['JavaScript', 'Python', 'Java', 'C++', 'React', 'SQL', 'General'];
const TECH_EXTRAS = ['TypeScript', 'Go', 'Rust', 'Docker', 'Kubernetes', 'PostgreSQL', 'GraphQL',
    'AWS', 'Redis', 'Next.js', 'Node.js', 'MongoDB', 'Terraform', 'Vue'];
const STATUSES = ['Open to Collaborate', 'Looking for Work', 'Busy', 'Just Browsing'];
const GENDERS = ['Male', 'Female', 'Other', 'Prefer not to say'];

const BIO_TEMPLATES = [
    (role, interest) => `${role} who spends most weekends deep in ${interest.toLowerCase()} rabbit holes.`,
    (role, interest) => `${role} focused on ${interest.toLowerCase()}. Always up for a code review swap.`,
    (role, interest) => `Working as a ${role.toLowerCase()}. Currently obsessed with ${interest.toLowerCase()}.`,
    (role, interest) => `${role} by day, tinkering with ${interest.toLowerCase()} side-projects by night.`,
    (role, interest) => `${role}. Interested in ${interest.toLowerCase()} and mentoring newer devs.`
];

const NORMAL_POST_TEMPLATES = [
    (lang) => `What's the cleanest way to handle pagination in ${lang} without over-fetching?`,
    (lang) => `Hit a weird edge case with async error handling in ${lang} — anyone dealt with this before?`,
    (lang) => `Is it worth migrating an existing ${lang} project to a monorepo? Looking for real experiences.`,
    (lang) => `Curious what testing setup people actually stick with long-term for ${lang} projects.`,
    (lang) => `What's your go-to pattern for structuring a mid-size ${lang} codebase?`,
    (lang) => `Been debugging a memory leak for two days in a ${lang} service. Sharing what I've tried so far.`,
    (lang) => `Do you version your ${lang} APIs in the URL or the header? Trying to settle a team debate.`,
    (lang) => `What convinced you to finally adopt strict typing in your ${lang} projects?`,
    (lang) => `Looking for feedback on a caching strategy I'm considering for a ${lang} backend.`,
    (lang) => `Anyone have a good mental model for when to reach for a queue vs. a direct call in ${lang}?`
];
const PEER_REVIEW_TEMPLATES = [
    (lang) => `Would appreciate a second pair of eyes on this ${lang} function before I ship it.`,
    (lang) => `First real attempt at writing idiomatic ${lang} — tell me what's off.`,
    (lang) => `Refactored this ${lang} module for readability, not sure I actually improved it.`,
    (lang) => `This ${lang} snippet works but feels fragile. What would you change?`,
    (lang) => `Trying to make this ${lang} code more testable — open to structural feedback.`
];
const COLLAB_SLOT_TEMPLATES = [
    (interest) => `Looking for 2-3 people to pair on a ${interest.toLowerCase()} side project this month.`,
    (interest) => `Starting a small study group around ${interest.toLowerCase()} — anyone interested in joining?`,
    (interest) => `Have a half-finished ${interest.toLowerCase()} tool, want a collaborator to help finish it.`,
    (interest) => `Hosting a weekly pairing session on ${interest.toLowerCase()} — open slot available.`
];
const BOUNTY_POST_TEMPLATES = [
    (lang) => `Bounty: fix a flaky test suite in a small ${lang} project.`,
    (lang) => `Bounty: implement rate limiting middleware for a ${lang} API.`,
    (lang) => `Bounty: optimize a slow database query layer written in ${lang}.`,
    (lang) => `Bounty: add dark mode support to a ${lang} front-end.`,
    (lang) => `Bounty: write missing unit tests for an untested ${lang} module.`
];
const REPO_REQUEST_DESCRIPTIONS = [
    'Need a few contributors to help clear the open-issues backlog before the next release.',
    'Small maintained project looking for help implementing a couple of long-requested features.',
    'Good-first-issue friendly repo — looking for people who want real open-source reps.',
    'Rewriting a legacy module and could use extra hands to keep the timeline realistic.',
    'Building out test coverage before a public launch, looking for collaborators.'
];
const REPO_NAME_POOL = ['devtrail/task-sync', 'openbeacon/api-gateway', 'lumen-ui/component-kit',
    'gridwork/scheduler', 'quietloop/cli-tools', 'northstar/data-pipeline', 'basecamp-clone/notes-app',
    'flockdesk/chat-widget', 'pathfinder/route-planner', 'stackforge/build-tool'];

const CODE_SNIPPETS = {
    JavaScript: `function debounce(fn, delay) {\n  let timer;\n  return (...args) => {\n    clearTimeout(timer);\n    timer = setTimeout(() => fn(...args), delay);\n  };\n}`,
    Python: `def chunk(items, size):\n    for i in range(0, len(items), size):\n        yield items[i:i + size]`,
    Java: `public static int binarySearch(int[] arr, int target) {\n    int lo = 0, hi = arr.length - 1;\n    while (lo <= hi) {\n        int mid = (lo + hi) / 2;\n        if (arr[mid] == target) return mid;\n        if (arr[mid] < target) lo = mid + 1; else hi = mid - 1;\n    }\n    return -1;\n}`,
    'C++': `int gcd(int a, int b) {\n    while (b != 0) {\n        int t = b;\n        b = a % b;\n        a = t;\n    }\n    return a;\n}`,
    React: `function useDebouncedValue(value, delay) {\n  const [debounced, setDebounced] = useState(value);\n  useEffect(() => {\n    const t = setTimeout(() => setDebounced(value), delay);\n    return () => clearTimeout(t);\n  }, [value, delay]);\n  return debounced;\n}`,
    SQL: `SELECT u.id, COUNT(p.id) AS post_count\nFROM users u\nLEFT JOIN posts p ON p.user_id = u.id\nGROUP BY u.id\nORDER BY post_count DESC\nLIMIT 10;`,
    General: null
};

const COMMENT_TEMPLATES = [
    "This is basically what I ended up doing — worked well in production.",
    "Have you profiled it first? Might be premature to optimize this part.",
    "I'd avoid this pattern, it tends to bite you once the team grows.",
    "Solid approach. One thing I'd add is a fallback for the empty-state case.",
    "Ran into the exact same issue last month — turned out to be a caching bug.",
    "Not sure I'd agree, but I see where you're coming from.",
    "This helped a lot, thank you for writing it out clearly.",
    "Would love to see the benchmark numbers if you have them.",
    "Small nit: this could probably be a one-liner with a reduce.",
    "This is a good starting point but I'd double check the edge cases around nulls.",
    "Been meaning to try this exact approach, appreciate the write-up.",
    "Curious how this holds up at scale — any load testing done?",
    "+1, this matches what's recommended in most style guides I've seen.",
    "I think there's a simpler way to express this, but it works as-is.",
    "Thanks for sharing, saved me a couple hours of trial and error."
];
const CODE_COMMENT_TEMPLATES = [
    'This could throw if the input is empty — worth guarding.',
    'Consider extracting this into a named helper for readability.',
    'Nice, this is a clean way to handle it.',
    'Might want to memoize this if it runs on every render.',
    'This variable name is a bit ambiguous, maybe rename it.',
    'This loop could be replaced with a built-in method.'
];

const PORTFOLIO_HEADLINES = [
    'Building small, focused tools and occasionally over-engineering side projects.',
    'Full-stack developer who cares more about clean APIs than shiny UI.',
    'I like fixing slow things and writing about how I fixed them.',
    'Currently learning distributed systems the hard way.',
    'Enjoys pairing, mentoring, and arguing about tabs vs. spaces.'
];
const PORTFOLIO_ITEM_TITLES = {
    PROJECT: ['Real-time chat widget', 'Personal budgeting CLI', 'Recipe recommender', 'Habit tracker API', 'Static site generator'],
    SKILL: ['System Design', 'API Design', 'Test-Driven Development', 'Performance Tuning', 'Accessibility'],
    ACHIEVEMENT: ['Top 3 finish in a coding competition', 'Merged 40+ pull requests to an open-source project', 'Ran a workshop on clean architecture'],
    EXPERIENCE: ['Backend internship', 'Freelance contract work', 'Open-source maintainer'],
    CUSTOM: ['Currently mentoring two junior developers', 'Runs a small dev newsletter']
};

const NEWS_TITLES = [
    'Understanding the Event Loop Once and For All',
    'Why We Moved Off Microservices (And Back)',
    'A Practical Guide to Database Indexing',
    'What I Learned Reviewing 500 Pull Requests',
    'CSS Grid Is More Powerful Than You Think',
    'Rate Limiting Strategies Compared',
    'The Case for Boring Technology',
    'Debugging Production Incidents Calmly',
    'How We Cut Our Build Times in Half',
    'Notes on Writing Better Error Messages'
];

const DUEL_QUESTION_IDS = {
    PYTHON: ['py-q1', 'py-q2', 'py-q3', 'py-q4', 'py-q5', 'py-q6'],
    JAVA: ['java-q1', 'java-q2', 'java-q3', 'java-q4', 'java-q5', 'java-q6'],
    JAVASCRIPT: ['js-q1', 'js-q2', 'js-q3', 'js-q4', 'js-q5', 'js-q6']
};

// ============================================================
// Main
// ============================================================
const seedDatabase = async () => {
    try {
        console.log('Starting realistic database seeding... this will take a moment.');

        await sequelize.query('SET FOREIGN_KEY_CHECKS = 0', { raw: true });
        await sequelize.sync({ force: true });
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 1', { raw: true });
        console.log('All tables dropped and recreated.');

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('Password123!', salt);

        // --------------------------------------------------------
        // 1. Users
        // --------------------------------------------------------
        console.log('Generating 50 users...');
        const usedUsernames = new Set();
        const usersToCreate = [];
        for (let i = 1; i <= 50; i++) {
            const first = getRandom(FIRST_NAMES);
            const last = getRandom(LAST_NAMES);
            let username = `${first}${last}`.toLowerCase();
            if (usedUsernames.has(username)) username += getRandomInt(2, 999);
            usedUsernames.add(username);

            const role = getRandom(ROLES);
            const interest = getRandom(INTERESTS);
            const techStack = getRandomSubset([...LANGUAGES.filter(l => l !== 'General'), ...TECH_EXTRAS], 2, 5);
            // ~30% of seeded users have publicly linked their GitHub profile.
            // None get a github_access_token — that requires a real Personal
            // Access Token verified against the live GitHub API (see
            // controllers/github.js), which a seed script can't fabricate.
            const hasGithubLink = chance(0.3);

            usersToCreate.push({
                username,
                password: hashedPassword,
                name: `${first} ${last}`,
                email: `${username}@example.com`,
                gender: getRandom(GENDERS),
                phone_number: chance(0.4) ? `+1${getRandomInt(200, 999)}${getRandomInt(1000000, 9999999)}` : null,
                company_university: getRandom(COMPANIES_UNIS),
                primary_language: getRandom(LANGUAGES.filter(l => l !== 'General')),
                birthdate: chance(0.6) ? new Date(getRandomInt(1985, 2004), getRandomInt(0, 11), getRandomInt(1, 28)) : null,
                address: chance(0.5) ? getRandom(['Toronto, CA', 'Berlin, DE', 'Austin, US', 'Bengaluru, IN',
                    'Lagos, NG', 'Singapore', 'São Paulo, BR', 'Warsaw, PL', 'Tokyo, JP', 'Nairobi, KE']) : null,
                social_media_links: chance(0.3) ? { twitter: `https://twitter.com/${username}` } : null,
                github_profile: hasGithubLink ? `https://github.com/${username}` : null,
                github_username: hasGithubLink ? username : null,
                github_access_token: null,
                bio: getRandom(BIO_TEMPLATES)(role, interest),
                field_of_interest: interest,
                profile_picture: 'default',
                tech_stack: techStack,
                current_role: role,
                years_of_experience: getRandomInt(0, 15),
                availability_status: getRandom(STATUSES),
                points: getRandomInt(0, 300),
                elo: 1000 + getRandomInt(-150, 150),
                pinned_badge_ids: []
            });
        }
        const createdUsers = await User.bulkCreate(usersToCreate, { returning: true });
        const userIds = createdUsers.map(u => u.id);
        const userById = new Map(createdUsers.map(u => [u.id, u]));
        console.log(`✓ ${createdUsers.length} users created (all share password: Password123!)`);

        // --------------------------------------------------------
        // 2. Follower network
        // --------------------------------------------------------
        console.log('Generating follower network...');
        for (const user of createdUsers) {
            const numFollowing = getRandomInt(3, 10);
            const targets = getRandomSubset(userIds.filter(id => id !== user.id), numFollowing, numFollowing);
            await user.addFollowing(targets);
        }

        // --------------------------------------------------------
        // 3. General collaboration groups (independent of repo requests)
        // --------------------------------------------------------
        console.log('Generating collaboration groups...');
        const GROUP_THEMES = ['ML Study Circle', 'Frontend Guild', 'Systems Design Club', 'Open Source Sprint Crew',
            'Interview Prep Squad', 'DevOps Book Club', 'Game Jam Team', 'Data Nerds', 'Security Reading Group',
            'Rust Curious', 'API Design Circle', 'Accessibility Advocates'];
        const groupsToCreate = GROUP_THEMES.map(theme => ({
            name: theme,
            description: `A space for people interested in ${theme.toLowerCase()} to plan, share progress, and keep each other accountable.`,
            is_private: chance(0.35)
        }));
        const createdGroups = await Group.bulkCreate(groupsToCreate, { returning: true });

        const groupMembersByGroup = new Map(); // groupId -> [{userId, role}]
        for (const group of createdGroups) {
            const memberCount = getRandomInt(4, 10);
            const memberIds = getRandomSubset(userIds, memberCount, memberCount);
            const roles = [];
            memberIds.forEach((uid, idx) => {
                let role = 'MEMBER';
                if (idx === 0) role = 'ADMIN';
                else if (idx === 1 && chance(0.6)) role = 'TEAM_MANAGER';
                else if (idx === 2 && chance(0.4)) role = 'SCRUM_MASTER';
                else if (idx === 3 && chance(0.4)) role = 'PRODUCT_OWNER';
                else if (chance(0.5)) role = 'DEVELOPER';
                roles.push({ userId: uid, role, status: chance(0.9) ? 'APPROVED' : 'PENDING' });
            });
            groupMembersByGroup.set(group.id, roles);
        }
        const groupMemberRows = [];
        for (const [groupId, members] of groupMembersByGroup) {
            for (const m of members) {
                groupMemberRows.push({ UserId: m.userId, GroupId: groupId, role: m.role, status: m.status });
            }
        }
        await GroupMember.bulkCreate(groupMemberRows);
        console.log(`✓ ${createdGroups.length} groups created with members`);

        // Meetings + Announcements from group leadership
        const meetingsToCreate = [];
        const announcementsToCreate = [];
        for (const group of createdGroups) {
            const members = groupMembersByGroup.get(group.id).filter(m => m.status === 'APPROVED');
            const leadership = members.filter(m => ['ADMIN', 'TEAM_MANAGER', 'SCRUM_MASTER'].includes(m.role));
            const leaders = leadership.length > 0 ? leadership : members;

            const numMeetings = getRandomInt(1, 3);
            for (let i = 0; i < numMeetings; i++) {
                const leader = getRandom(leaders);
                meetingsToCreate.push({
                    description: getRandom(['Weekly sync', 'Sprint planning', 'Pairing session', 'Retro + demo', 'Kickoff call']),
                    scheduled_at: chance(0.5) ? daysFromNow(getRandomInt(1, 14)) : daysAgo(getRandomInt(1, 30)),
                    GroupId: group.id,
                    ScheduledByUserId: leader.userId
                });
            }

            const numAnnouncements = getRandomInt(0, 3);
            for (let i = 0; i < numAnnouncements; i++) {
                const leader = getRandom(leaders);
                announcementsToCreate.push({
                    text_content: getRandom([
                        'Reminder: please push your progress before Friday\'s check-in.',
                        'Welcome to the newest members — introduce yourselves in the thread!',
                        'We moved next week\'s session up by a day, updated the calendar.',
                        'Great turnout this week, thanks everyone for showing up prepared.',
                        'Looking for a volunteer to lead next session\'s walkthrough.'
                    ]),
                    GroupId: group.id,
                    UserId: leader.userId
                });
            }
        }
        await Meeting.bulkCreate(meetingsToCreate);
        await Announcement.bulkCreate(announcementsToCreate);
        console.log(`✓ ${meetingsToCreate.length} meetings, ${announcementsToCreate.length} announcements created`);

        // --------------------------------------------------------
        // 4. Posts (500) — across all 5 categories, with category-specific fields
        // --------------------------------------------------------
        console.log('Generating 500 posts...');
        // Rough real-forum-like distribution: mostly normal discussion, less of the special categories.
        const categoryPool = [
            ['NORMAL', 45], ['PEER_REVIEW', 20], ['COLLAB_SLOT', 12], ['MICRO_BOUNTY', 13], ['REPO_REQUEST', 10]
        ];

        const createdPosts = [];
        const repoRequestPostIds = [];
        const microBountyPostIds = [];

        for (let i = 1; i <= 500; i++) {
            const category = weightedPick(categoryPool);
            const language = category === 'COLLAB_SLOT' ? 'General' : getRandom(LANGUAGES);
            const authorId = getRandom(userIds);

            // ~20% of eligible posts (non-repo-request) get attached to one of the general groups
            let groupId = null;
            if (category !== 'REPO_REQUEST' && chance(0.15)) {
                const eligibleGroups = createdGroups.filter(g => {
                    const members = groupMembersByGroup.get(g.id);
                    return members.some(m => m.userId === authorId && m.status === 'APPROVED');
                });
                if (eligibleGroups.length > 0) groupId = getRandom(eligibleGroups).id;
            }

            let text_content, code_snippet = null;
            let bounty_reward_points = null, bounty_deadline = null, bounty_status = null;
            let repo_name = null, people_needed = null;

            const includeCode = language !== 'General' && chance(0.6);

            switch (category) {
                case 'NORMAL':
                    text_content = getRandom(NORMAL_POST_TEMPLATES)(language === 'General' ? 'this' : language);
                    break;
                case 'PEER_REVIEW':
                    text_content = getRandom(PEER_REVIEW_TEMPLATES)(language === 'General' ? 'this' : language);
                    code_snippet = CODE_SNIPPETS[language] || CODE_SNIPPETS.JavaScript;
                    break;
                case 'COLLAB_SLOT':
                    text_content = getRandom(COLLAB_SLOT_TEMPLATES)(getRandom(INTERESTS));
                    break;
                case 'MICRO_BOUNTY':
                    text_content = getRandom(BOUNTY_POST_TEMPLATES)(language === 'General' ? 'JavaScript' : language);
                    bounty_reward_points = getRandom([25, 50, 75, 100, 150, 200]);
                    bounty_deadline = daysFromNow(getRandomInt(3, 30));
                    bounty_status = chance(0.7) ? 'OPEN' : 'CLOSED';
                    break;
                case 'REPO_REQUEST':
                    text_content = getRandom(REPO_REQUEST_DESCRIPTIONS);
                    repo_name = getRandom(REPO_NAME_POOL);
                    people_needed = getRandomInt(1, 5);
                    break;
            }

            if (category !== 'PEER_REVIEW' && includeCode) {
                code_snippet = CODE_SNIPPETS[language] || null;
            }

            createdPosts.push({
                text_content,
                code_snippet,
                category,
                language,
                bounty_reward_points,
                bounty_deadline,
                bounty_status,
                GroupId: groupId,
                repo_name,
                people_needed,
                RepoGroupId: null, // filled in below for REPO_REQUEST posts
                DuplicateOfPostId: null,
                UserId: authorId,
                createdAt: daysAgo(getRandomInt(0, 120)),
                updatedAt: new Date()
            });
        }

        const insertedPosts = await Post.bulkCreate(createdPosts, { returning: true });
        const postIds = insertedPosts.map(p => p.id);
        insertedPosts.forEach(p => {
            if (p.category === 'REPO_REQUEST') repoRequestPostIds.push(p.id);
            if (p.category === 'MICRO_BOUNTY') microBountyPostIds.push(p.id);
        });

        // Flag a small handful of posts as duplicates of an earlier post
        const duplicateCandidates = getRandomSubset(insertedPosts.filter(p => p.category === 'NORMAL'), 10, 18);
        for (const post of duplicateCandidates) {
            const earlierPosts = insertedPosts.filter(p => p.id < post.id && p.category === 'NORMAL');
            if (earlierPosts.length === 0) continue;
            const original = getRandom(earlierPosts);
            await post.update({ DuplicateOfPostId: original.id });
        }
        console.log(`✓ ${insertedPosts.length} posts created`);

        // --------------------------------------------------------
        // 5. Repository Request groups — each spawns its own private Group,
        //    the author becomes ADMIN, and a handful of joiners fill it out.
        // --------------------------------------------------------
        console.log('Spinning up private groups for repository requests...');
        for (const postId of repoRequestPostIds) {
            const post = insertedPosts.find(p => p.id === postId);
            const repoGroup = await Group.create({
                name: `${post.repo_name} contributors`,
                description: `Private collaboration space for the "${post.repo_name}" repository request.`,
                is_private: true
            });
            await post.update({ RepoGroupId: repoGroup.id });

            await GroupMember.create({ UserId: post.UserId, GroupId: repoGroup.id, role: 'ADMIN', status: 'APPROVED' });

            const joinerPool = userIds.filter(id => id !== post.UserId);
            const numJoiners = getRandomInt(0, post.people_needed);
            const joiners = getRandomSubset(joinerPool, numJoiners, numJoiners);
            for (const joinerId of joiners) {
                await RepoRequestJoin.create({ UserId: joinerId, PostId: post.id, joined_at: daysAgo(getRandomInt(0, 20)) });
                await GroupMember.create({ UserId: joinerId, GroupId: repoGroup.id, role: 'DEVELOPER', status: 'APPROVED' });
            }
        }
        console.log(`✓ ${repoRequestPostIds.length} repo-request groups created`);

        // --------------------------------------------------------
        // 6. Comments (with threaded replies + best answers) and CodeComments
        // --------------------------------------------------------
        console.log('Generating comments...');
        const topLevelCommentsToCreate = [];
        for (let i = 1; i <= 900; i++) {
            topLevelCommentsToCreate.push({
                text_content: getRandom(COMMENT_TEMPLATES),
                code_snippet: chance(0.1) ? CODE_SNIPPETS[getRandom(['JavaScript', 'Python', 'Java'])] : null,
                UserId: getRandom(userIds),
                PostId: getRandom(postIds),
                createdAt: daysAgo(getRandomInt(0, 110)),
                updatedAt: new Date()
            });
        }
        const insertedTopLevelComments = await Comment.bulkCreate(topLevelCommentsToCreate, { returning: true });

        // ~300 threaded replies attached to random existing comments
        const repliesToCreate = [];
        for (let i = 1; i <= 300; i++) {
            const parent = getRandom(insertedTopLevelComments);
            repliesToCreate.push({
                text_content: getRandom(COMMENT_TEMPLATES),
                code_snippet: null,
                UserId: getRandom(userIds),
                PostId: parent.PostId,
                ParentId: parent.id,
                createdAt: daysAgo(getRandomInt(0, 100)),
                updatedAt: new Date()
            });
        }
        await Comment.bulkCreate(repliesToCreate);

        // A handful of soft-deleted comments, for realism
        const toSoftDelete = getRandomSubset(insertedTopLevelComments, 10, 20);
        for (const c of toSoftDelete) await c.update({ is_deleted: true });

        // Mark a best answer on ~40% of PEER_REVIEW / NORMAL posts that have comments
        const commentsByPost = new Map();
        insertedTopLevelComments.forEach(c => {
            if (!commentsByPost.has(c.PostId)) commentsByPost.set(c.PostId, []);
            commentsByPost.get(c.PostId).push(c);
        });
        for (const [postId, comments] of commentsByPost) {
            if (comments.length > 0 && chance(0.4)) {
                await getRandom(comments).update({ is_best_answer: true });
            }
        }
        console.log(`✓ ${insertedTopLevelComments.length + repliesToCreate.length} comments created`);

        // Inline code review comments on PEER_REVIEW posts that have a code snippet
        console.log('Generating inline code comments...');
        const peerReviewPosts = insertedPosts.filter(p => p.category === 'PEER_REVIEW' && p.code_snippet);
        const codeCommentsToCreate = [];
        for (const post of peerReviewPosts) {
            const lineCount = post.code_snippet.split('\n').length;
            const numComments = getRandomInt(0, 4);
            for (let i = 0; i < numComments; i++) {
                codeCommentsToCreate.push({
                    line_number: getRandomInt(1, Math.max(1, lineCount)),
                    text_content: getRandom(CODE_COMMENT_TEMPLATES),
                    UserId: getRandom(userIds),
                    PostId: post.id
                });
            }
        }
        await CodeComment.bulkCreate(codeCommentsToCreate);
        console.log(`✓ ${codeCommentsToCreate.length} inline code comments created`);

        // --------------------------------------------------------
        // 7. Votes
        // --------------------------------------------------------
        console.log('Generating votes...');
        const voteSet = new Set();
        const votesToCreate = [];
        while (votesToCreate.length < 2500) {
            const uId = getRandom(userIds);
            const pId = getRandom(postIds);
            const combo = `${uId}-${pId}`;
            if (voteSet.has(combo)) continue;
            voteSet.add(combo);
            votesToCreate.push({
                type: weightedPick([['UP', 80], ['DOWN', 20]]),
                UserId: uId,
                PostId: pId
            });
        }
        await Vote.bulkCreate(votesToCreate);
        console.log(`✓ ${votesToCreate.length} votes created`);

        // --------------------------------------------------------
        // 8. Micro-bounty enrollments + submissions
        // --------------------------------------------------------
        console.log('Generating bounty enrollments and submissions...');
        for (const postId of microBountyPostIds) {
            const post = insertedPosts.find(p => p.id === postId);
            const candidates = userIds.filter(id => id !== post.UserId);
            const enrollees = getRandomSubset(candidates, 2, 6);

            for (const userId of enrollees) {
                const submits = chance(0.65);
                const enrollment = await BountyEnrollment.create({
                    UserId: userId,
                    PostId: post.id,
                    status: submits ? weightedPick([['SUBMITTED', 40], ['COMPLETED', 60]]) : 'ENROLLED'
                });

                if (submits) {
                    const reviewed = enrollment.status === 'COMPLETED';
                    await BountySubmission.create({
                        code_content: CODE_SNIPPETS[post.language] || CODE_SNIPPETS.JavaScript,
                        status: reviewed ? 'REVIEWED' : 'PENDING',
                        marks: reviewed ? getRandomInt(Math.floor((post.bounty_reward_points || 50) * 0.4), post.bounty_reward_points || 50) : null,
                        feedback: reviewed ? getRandom([
                            'Solid work, this cleanly solves the issue.',
                            'Good attempt — docked a few points for missing edge cases.',
                            'Nice job, merged with a couple of minor tweaks.',
                            'Meets the requirements but could use more tests.'
                        ]) : null,
                        UserId: userId,
                        PostId: post.id
                    });

                    if (reviewed) {
                        const marksAwarded = await BountySubmission.findOne({ where: { UserId: userId, PostId: post.id } });
                        const user = userById.get(userId);
                        user.points += marksAwarded.marks;
                    }
                }
            }
        }
        console.log(`✓ Bounty activity generated for ${microBountyPostIds.length} bounty posts`);

        // --------------------------------------------------------
        // 9. Competitions + submissions
        // --------------------------------------------------------
        console.log('Generating competitions...');
        const COMPETITION_TITLES = [
            'Weekend Algorithm Sprint', 'String Manipulation Showdown', 'Graph Traversal Challenge',
            'Dynamic Programming Deep Dive', 'Data Structures Speedrun', 'Optimization Puzzle Night',
            'Recursion Rumble', 'Big-O Battle', 'Array Wrangling Contest', 'Systems Trivia & Coding Mix'
        ];
        const competitionsToCreate = COMPETITION_TITLES.map((title, idx) => {
            const isPast = idx < 6; // 6 past, 4 upcoming
            const start_time = isPast ? daysAgo(getRandomInt(5, 90)) : daysFromNow(getRandomInt(2, 30));
            return {
                title,
                description: `A timed coding challenge open to the community. Solve the problem within the window and submit your solution.`,
                language: getRandom(['Python', 'JavaScript', 'Java', 'C++']),
                question_content: `Given the constraints described in the prompt, implement an efficient solution and explain your approach in comments.`,
                start_time,
                duration_minutes: getRandom([30, 45, 60, 90]),
                evaluation_mode: 'MANUAL',
                elo_awarded: isPast,
                UserId: getRandom(userIds)
            };
        });
        const createdCompetitions = await Competition.bulkCreate(competitionsToCreate, { returning: true });

        const submissionKeys = new Set();
        for (const [idx, competition] of createdCompetitions.entries()) {
            const isPast = idx < 6;
            if (!isPast) continue; // upcoming competitions have no submissions yet

            const participants = getRandomSubset(userIds, 6, 16);
            for (const userId of participants) {
                const key = `${userId}-${competition.id}`;
                if (submissionKeys.has(key)) continue;
                submissionKeys.add(key);

                const evaluated = chance(0.8);
                const submission = await CompetitionSubmission.create({
                    code_content: CODE_SNIPPETS[competition.language] || CODE_SNIPPETS.Python,
                    first_submitted_at: new Date(competition.start_time.getTime() + getRandomInt(2, competition.duration_minutes - 1) * 60000),
                    time_complexity: evaluated ? getRandom(['O(n)', 'O(n log n)', 'O(n^2)', 'O(log n)']) : null,
                    score: evaluated ? getRandomInt(40, 100) : null,
                    feedback: evaluated ? getRandom([
                        'Efficient and clean, well done.',
                        'Correct but could be optimized further.',
                        'Good solution, minor style issues.',
                        'Works, though the time complexity could be better.'
                    ]) : null,
                    status: evaluated ? 'EVALUATED' : 'PENDING',
                    UserId: userId,
                    CompetitionId: competition.id
                });

                if (evaluated) {
                    const user = userById.get(userId);
                    user.points += submission.score;
                    if (competition.elo_awarded) {
                        user.elo += Math.round((submission.score - 60) / 4); // rough win/loss-style adjustment
                    }
                }
            }
        }
        console.log(`✓ ${createdCompetitions.length} competitions created (6 past with submissions, 4 upcoming)`);

        // --------------------------------------------------------
        // 10. Duels (+ questions + submissions), then derive duel_wins/elo
        // --------------------------------------------------------
        console.log('Generating 1v1 duels...');
        const duelStatusPool = [['PENDING', 15], ['DECLINED', 15], ['ACTIVE', 20], ['COMPLETED', 50]];

        for (let i = 0; i < 80; i++) {
            const challengerId = getRandom(userIds);
            let opponentId = getRandom(userIds);
            while (opponentId === challengerId) opponentId = getRandom(userIds);

            const language = getRandom(['PYTHON', 'JAVA', 'JAVASCRIPT']);
            const status = weightedPick(duelStatusPool);
            const question_count = getRandomInt(3, 5);

            if (status === 'PENDING' || status === 'DECLINED') {
                await Duel.create({
                    language, status, question_count,
                    ChallengerId: challengerId, OpponentId: opponentId,
                    started_at: null, WinnerId: null
                });
                continue;
            }

            const started_at = status === 'COMPLETED' ? daysAgo(getRandomInt(1, 60)) : hoursAgo(getRandomInt(0, 3));
            const duel = await Duel.create({
                language, status: 'ACTIVE', question_count,
                ChallengerId: challengerId, OpponentId: opponentId,
                started_at, WinnerId: null
            });

            const answeredQuestionCount = status === 'ACTIVE' ? getRandomInt(1, question_count - 1) : question_count;
            const questionIds = getRandomSubset(DUEL_QUESTION_IDS[language], question_count, question_count);

            let challengerTotal = 0, opponentTotal = 0;
            for (let order_index = 0; order_index < question_count; order_index++) {
                const duration_seconds = 15;
                const q_started_at = new Date(started_at.getTime() + order_index * duration_seconds * 1000);
                const question = await DuelQuestion.create({
                    question_id: questionIds[order_index],
                    order_index,
                    started_at: q_started_at,
                    duration_seconds,
                    DuelId: duel.id
                });

                if (order_index >= answeredQuestionCount) continue; // unanswered questions for in-progress duels

                const makeSubmission = async (userId) => {
                    const answered = chance(0.85);
                    const isCorrect = answered && chance(0.6);
                    return DuelSubmission.create({
                        selected_option_index: answered ? getRandomInt(0, 3) : null,
                        is_correct: isCorrect,
                        time_taken_ms: answered ? getRandomInt(800, 14500) : null,
                        points_earned: 0, // corrected below once both sides are known
                        status: answered ? 'ANSWERED' : 'TIMED_OUT',
                        UserId: userId,
                        DuelQuestionId: question.id
                    });
                };

                const challengerSub = await makeSubmission(challengerId);
                const opponentSub = await makeSubmission(opponentId);

                // Fastest correct answer wins the 15 points for this question
                let winnerSub = null;
                if (challengerSub.is_correct && opponentSub.is_correct) {
                    winnerSub = challengerSub.time_taken_ms <= opponentSub.time_taken_ms ? challengerSub : opponentSub;
                } else if (challengerSub.is_correct) {
                    winnerSub = challengerSub;
                } else if (opponentSub.is_correct) {
                    winnerSub = opponentSub;
                }
                if (winnerSub) {
                    await winnerSub.update({ points_earned: 15 });
                    if (winnerSub.UserId === challengerId) challengerTotal += 15; else opponentTotal += 15;
                }
            }

            if (status === 'COMPLETED') {
                let winnerId = null;
                if (challengerTotal !== opponentTotal) {
                    winnerId = challengerTotal > opponentTotal ? challengerId : opponentId;
                }
                await duel.update({ status: 'COMPLETED', WinnerId: winnerId });

                if (winnerId) {
                    const loserId = winnerId === challengerId ? opponentId : challengerId;
                    userById.get(winnerId).elo += getRandomInt(10, 25);
                    userById.get(loserId).elo -= getRandomInt(5, 20);
                }
            }
        }
        console.log('✓ 80 duels created across pending/declined/active/completed states');

        // Persist the points/elo adjustments accumulated above
        console.log('Applying accumulated points/elo updates...');
        for (const user of createdUsers) {
            user.elo = Math.max(600, user.elo); // keep elo in a sane floor range
            await user.save();
        }

        // --------------------------------------------------------
        // 11. Notifications
        // --------------------------------------------------------
        console.log('Generating notifications...');
        const notificationsToCreate = [];
        const allDuels = await Duel.findAll();
        for (const duel of allDuels) {
            if (duel.status === 'PENDING') {
                notificationsToCreate.push({
                    type: 'DUEL_INVITE',
                    message: `${userById.get(duel.ChallengerId)?.username || 'A user'} challenged you to a duel.`,
                    link: `/duel/${duel.id}`,
                    is_read: chance(0.4),
                    UserId: duel.OpponentId
                });
            } else if (duel.status === 'COMPLETED') {
                notificationsToCreate.push({
                    type: 'DUEL_COMPLETED',
                    message: duel.WinnerId ? 'Your duel has finished — check the results.' : 'Your duel ended in a tie.',
                    link: `/duel/${duel.id}`,
                    is_read: chance(0.7),
                    UserId: duel.ChallengerId
                });
                notificationsToCreate.push({
                    type: 'DUEL_COMPLETED',
                    message: duel.WinnerId ? 'Your duel has finished — check the results.' : 'Your duel ended in a tie.',
                    link: `/duel/${duel.id}`,
                    is_read: chance(0.7),
                    UserId: duel.OpponentId
                });
            }
        }
        // A few generic engagement notifications too
        for (let i = 0; i < 60; i++) {
            notificationsToCreate.push({
                type: getRandom(['NEW_FOLLOWER', 'BOUNTY_REVIEWED', 'BEST_ANSWER']),
                message: getRandom([
                    'Someone started following you.',
                    'Your bounty submission was reviewed.',
                    'Your answer was marked as the best answer.'
                ]),
                link: null,
                is_read: chance(0.5),
                UserId: getRandom(userIds)
            });
        }
        await Notification.bulkCreate(notificationsToCreate);
        console.log(`✓ ${notificationsToCreate.length} notifications created`);

        // --------------------------------------------------------
        // 12. Direct messages between users who follow each other
        // --------------------------------------------------------
        console.log('Generating direct messages...');
        const messagesToCreate = [];
        const MESSAGE_TEXTS = [
            "Hey, saw your post — mind if I ask a follow-up question?",
            "Thanks for the review, really helpful feedback.",
            "Are you still looking for people on that repo request?",
            "Good duel! Want a rematch sometime this week?",
            "Following up on the bounty — submitted my solution.",
            "Loved your write-up, learned a lot from it."
        ];
        for (let i = 0; i < 400; i++) {
            const senderId = getRandom(userIds);
            let receiverId = getRandom(userIds);
            while (receiverId === senderId) receiverId = getRandom(userIds);
            messagesToCreate.push({
                text_content: getRandom(MESSAGE_TEXTS),
                is_read: chance(0.6),
                SenderId: senderId,
                ReceiverId: receiverId,
                createdAt: daysAgo(getRandomInt(0, 60)),
                updatedAt: new Date()
            });
        }
        await Message.bulkCreate(messagesToCreate);
        console.log(`✓ ${messagesToCreate.length} messages created`);

        // --------------------------------------------------------
        // 13. Portfolios
        // --------------------------------------------------------
        console.log('Generating portfolios...');
        const portfolioUsers = getRandomSubset(userIds, 25, 32);
        const portfolioItemsToCreate = [];
        for (const userId of portfolioUsers) {
            const portfolio = await Portfolio.create({
                template: getRandom(['MINIMAL', 'MODERN', 'CLASSIC']),
                headline: getRandom(PORTFOLIO_HEADLINES),
                UserId: userId
            });

            const itemTypes = getRandomSubset(Object.keys(PORTFOLIO_ITEM_TITLES), 2, 4);
            let order = 0;
            for (const type of itemTypes) {
                const title = getRandom(PORTFOLIO_ITEM_TITLES[type]);
                portfolioItemsToCreate.push({
                    type,
                    title,
                    description: `Details about "${title.toLowerCase()}" — added from the Extra page.`,
                    order: order++,
                    PortfolioId: portfolio.id
                });
            }
        }
        await PortfolioItem.bulkCreate(portfolioItemsToCreate);
        console.log(`✓ ${portfolioUsers.length} portfolios created with ${portfolioItemsToCreate.length} items`);

        // --------------------------------------------------------
        // 14. Daily quiz attempts
        // --------------------------------------------------------
        console.log('Generating quiz attempts...');
        const quizAttemptsToCreate = [];
        for (const userId of userIds) {
            const numAttempts = getRandomInt(0, 12);
            const daysPlayed = getRandomSubset(Array.from({ length: 30 }, (_, i) => i), numAttempts, numAttempts);
            for (const d of daysPlayed) {
                const date = daysAgo(d);
                quizAttemptsToCreate.push({
                    date_played: date.toISOString().slice(0, 10),
                    score: getRandomInt(0, 10),
                    UserId: userId
                });
            }
        }
        await QuizAttempt.bulkCreate(quizAttemptsToCreate);
        console.log(`✓ ${quizAttemptsToCreate.length} quiz attempts created`);

        // --------------------------------------------------------
        // 15. Saved news articles
        // --------------------------------------------------------
        console.log('Generating saved news...');
        const savedNewsToCreate = [];
        let externalIdCounter = 100000;
        for (const userId of userIds) {
            if (!chance(0.5)) continue;
            const numSaved = getRandomInt(1, 6);
            for (let i = 0; i < numSaved; i++) {
                const title = getRandom(NEWS_TITLES);
                savedNewsToCreate.push({
                    title,
                    url: `https://dev.to/articles/${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
                    source: 'Dev.to',
                    external_id: externalIdCounter++,
                    UserId: userId
                });
            }
        }
        await SavedNews.bulkCreate(savedNewsToCreate);
        console.log(`✓ ${savedNewsToCreate.length} saved news entries created`);

        console.log('\n✅ Realistic database seed complete!');
        console.log(`   Users: ${createdUsers.length} (login with any @example.com address / Password123!)`);
        console.log(`   Posts: ${insertedPosts.length}, Comments: ${insertedTopLevelComments.length + repliesToCreate.length}, Votes: ${votesToCreate.length}`);
        console.log(`   Groups: ${createdGroups.length + repoRequestPostIds.length} (incl. repo-request groups), Competitions: ${createdCompetitions.length}, Duels: 80`);
        process.exit(0);

    } catch (error) {
        console.error('❌ Failed to seed database:', error);
        process.exit(1);
    }
};

seedDatabase();