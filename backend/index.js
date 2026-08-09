const express = require('express');
const cors = require('cors');
require('dotenv').config();
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

const app = express();
const PORT = process.env.PORT || 3001;

// Cors Middleware
app.use(cors({
    origin: 'http://localhost:5173', 
    credentials: true
}));
app.use(express.json());

// Routers
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

const postRoutes = require('./routes/posts');
app.use('/api/posts', postRoutes);

const userRoutes = require('./routes/users')
app.use('/api/users', userRoutes);

const bountyRoutes = require('./routes/bounty');
app.use('/api/bounty', bountyRoutes);

const competitionRoutes = require('./routes/competition');
app.use('/api/competition', competitionRoutes);

const groupRoutes = require('./routes/groups');
app.use('/api/groups', groupRoutes);

// Fallback Route
app.get('/', (req, res) => {
    res.send("StackUnderflow API is running!");
});


// Database Relationships
User.hasMany(Post);
Post.belongsTo(User);

// Posts and Comments
Post.hasMany(Comment);
Comment.belongsTo(Post);
User.hasMany(Comment);
Comment.belongsTo(User);

// Comments and Replies
Comment.hasMany(Comment, { as: 'Replies', foreignKey: 'ParentId' });
Comment.belongsTo(Comment, { as: 'Parent', foreignKey: 'ParentId' });

// Users, Posts, and Votes
User.hasMany(Vote);
Vote.belongsTo(User);
Post.hasMany(Vote);
Vote.belongsTo(Post);

// Followers & Following (One-way relationships)
User.belongsToMany(User, { as: 'Followers', through: 'UserFollowers', foreignKey: 'followingId', otherKey: 'followerId' });
User.belongsToMany(User, { as: 'Following', through: 'UserFollowers', foreignKey: 'followerId', otherKey: 'followingId' });

// Micro Bounty Board
User.hasMany(BountyEnrollment);
BountyEnrollment.belongsTo(User);
Post.hasMany(BountyEnrollment);
BountyEnrollment.belongsTo(Post);

User.hasMany(BountySubmission);
BountySubmission.belongsTo(User);
Post.hasMany(BountySubmission);
BountySubmission.belongsTo(Post);
User.hasMany(Competition);

// Coding Competition 
Competition.belongsTo(User);
User.hasMany(CompetitionSubmission);
CompetitionSubmission.belongsTo(User);
Competition.hasMany(CompetitionSubmission);
CompetitionSubmission.belongsTo(Competition);

// Group Creation
User.belongsToMany(Group, { through: GroupMember });
Group.belongsToMany(User, { through: GroupMember });
Group.hasMany(Post);
Post.belongsTo(Group);

// Database Sync and Server Start
sequelize.sync().then(() => {
    console.log('Database connected successfully!');
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}).catch((error) => {
    console.error('Unable to connect to the database:', error);
});

