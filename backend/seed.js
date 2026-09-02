const bcrypt = require('bcrypt');
const sequelize = require('./config/db');
const User = require('./models/User');
const Post = require('./models/Post');
const Comment = require('./models/Comment');
const Vote = require('./models/Vote');

// Ensure relationships are initialized
require('./index.js'); // Assuming your associations are declared here

// Helper function to pick a random item from an array
const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

const seedDatabase = async () => {
    try {
        console.log("Starting MASSIVE database seeding... This might take a moment.");

        // 1. Wipe the database clean - temporarily disable FK checks
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 0', { raw: true });
        await sequelize.sync({ force: true });
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 1', { raw: true });
        console.log("All tables dropped and recreated.");

        // Hash one password to use for all 50 users (saves processing time)
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('Password123!', salt);

        // Arrays containing exact ENUMs from your models to prevent DB errors
        const genders = ['Male', 'Female', 'Other', 'Prefer not to say'];
        const statuses = ['Open to Collaborate', 'Looking for Work', 'Busy', 'Just Browsing'];
        const categories = ['NORMAL', 'PEER_REVIEW', 'COLLAB_SLOT', 'MICRO_BOUNTY'];
        const languages = ['JavaScript', 'Python', 'Java', 'C++', 'React', 'SQL', 'General'];

        // 2. Generate 50 Users
        console.log("Generating 50 Users...");
        const usersToCreate = [];
        for (let i = 1; i <= 50; i++) {
            usersToCreate.push({
                username: `user_${i}`,
                password: hashedPassword,
                name: `Dev User ${i}`,
                email: `user${i}@example.com`,
                gender: getRandom(genders),
                current_role: `Role ${getRandom(['Engineer', 'Student', 'Designer', 'Manager'])}`,
                tech_stack: [getRandom(languages), getRandom(languages)],
                bio: `This is a randomly generated bio for user ${i}. Just writing some placeholder text to fill out the profile.`,
                availability_status: getRandom(statuses)
            });
        }
        // Insert all 50 users at once
        const createdUsers = await User.bulkCreate(usersToCreate, { returning: true });
        const userIds = createdUsers.map(u => u.id); // Save their IDs for later

        // 3. Generate Follower Network
        console.log("Generating Follower Network...");
        for (const user of createdUsers) {
            // Each user will follow between 3 and 10 random people
            const numFollowing = Math.floor(Math.random() * 8) + 3;
            const followingIds = new Set();
            
            while (followingIds.size < numFollowing) {
                const randomId = getRandom(userIds);
                // Prevent following themselves
                if (randomId !== user.id) followingIds.add(randomId);
            }
            // Add associations
            await user.addFollowing(Array.from(followingIds));
        }

        // 4. Generate 500 Posts
        console.log("Generating 500 Posts...");
        const postsToCreate = [];
        for (let i = 1; i <= 500; i++) {
            postsToCreate.push({
                text_content: `Gibberish post #${i}: Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.`,
                // 50% chance to have a code snippet
                code_snippet: Math.random() > 0.5 ? `function test() {\n  console.log("Hello from post ${i}");\n  return true;\n}` : null,
                category: getRandom(categories),
                language: getRandom(languages),
                UserId: getRandom(userIds) // Assign to random user
            });
        }
        const createdPosts = await Post.bulkCreate(postsToCreate, { returning: true });
        const postIds = createdPosts.map(p => p.id);

        // 5. Generate 1,000 Comments
        console.log("Generating 1,000 Random Comments...");
        const commentsToCreate = [];
        for (let i = 1; i <= 1000; i++) {
            commentsToCreate.push({
                text_content: `This is random placeholder comment #${i} adding to the discussion. Totally gibberish!`,
                UserId: getRandom(userIds),
                PostId: getRandom(postIds)
            });
        }
        await Comment.bulkCreate(commentsToCreate);

        // 6. Generate 2,000 Votes
        console.log("Generating 2,000 Random Votes...");
        const voteSet = new Set();
        const votesToCreate = [];
        
        while (votesToCreate.length < 2000) {
            const uId = getRandom(userIds);
            const pId = getRandom(postIds);
            const combo = `${uId}-${pId}`;
            
            // Ensure 1 unique vote per user per post
            if (!voteSet.has(combo)) {
                voteSet.add(combo);
                votesToCreate.push({
                    type: getRandom(['UP', 'DOWN']),
                    UserId: uId,
                    PostId: pId
                });
            }
        }
        await Vote.bulkCreate(votesToCreate);

        console.log("✅ Massive database seeded successfully!");
        process.exit(0);

    } catch (error) {
        console.error("❌ Failed to seed database:", error);
        process.exit(1);
    }
};

seedDatabase();