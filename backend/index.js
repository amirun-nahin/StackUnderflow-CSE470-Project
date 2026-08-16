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
const Message = require('./models/Message');
const SavedNews = require('./models/SavedNews');
//const QuestionBank = require('./models/QuestionBank');
const Duel = require('./models/Duel');
const DuelQuestion = require('./models/DuelQuestion');
const DuelSubmission = require('./models/DuelSubmission');
const Notification = require('./models/Notification');
const QuizAttempt = require('./models/QuizAttempt');
const RepoRequestJoin = require('./models/RepoRequestJoin');

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

const chatRoutes = require('./routes/chat');
app.use('/api/chat', chatRoutes);

const newsRoutes = require('./routes/news');
app.use('/api/news', newsRoutes);

const jobRoutes = require('./routes/jobs');
app.use('/api/jobs', jobRoutes);

const duelRoutes = require('./routes/duel');
app.use('/api/duel', duelRoutes);

const notificationRoutes = require('./routes/notifications');
app.use('/api/notifications', notificationRoutes);

const quizRoutes = require('./routes/quiz');
app.use('/api/quiz', quizRoutes);

const githubRoutes = require('./routes/github');
app.use('/api/github', githubRoutes);

const repoRequestRoutes = require('./routes/repoRequest');
app.use('/api/repo-request', repoRequestRoutes);

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

// Chat Messaging
User.hasMany(Message, { as: 'SentMessages', foreignKey: 'SenderId' });
Message.belongsTo(User, { as: 'Sender', foreignKey: 'SenderId' });

User.hasMany(Message, { as: 'ReceivedMessages', foreignKey: 'ReceiverId' });
Message.belongsTo(User, { as: 'Receiver', foreignKey: 'ReceiverId' });

// Saved News
User.hasMany(SavedNews);
SavedNews.belongsTo(User);
// 1v1 Coding Duels
User.hasMany(Duel, { as: 'ChallengesSent', foreignKey: 'ChallengerId' });
Duel.belongsTo(User, { as: 'Challenger', foreignKey: 'ChallengerId' });
User.hasMany(Duel, { as: 'ChallengesReceived', foreignKey: 'OpponentId' });
Duel.belongsTo(User, { as: 'Opponent', foreignKey: 'OpponentId' });
User.hasMany(Duel, { as: 'DuelsWon', foreignKey: 'WinnerId' });
Duel.belongsTo(User, { as: 'Winner', foreignKey: 'WinnerId' });

Duel.hasMany(DuelQuestion);
DuelQuestion.belongsTo(Duel);
// QuestionBank.hasMany(DuelQuestion);
// DuelQuestion.belongsTo(QuestionBank);

User.hasMany(DuelSubmission);
DuelSubmission.belongsTo(User);
DuelQuestion.hasMany(DuelSubmission);
DuelSubmission.belongsTo(DuelQuestion);

User.hasMany(Notification);
Notification.belongsTo(User);

// Open-Source Collaboration: Repository Request join/leave
User.hasMany(RepoRequestJoin);
RepoRequestJoin.belongsTo(User);
Post.hasMany(RepoRequestJoin);
RepoRequestJoin.belongsTo(Post);

// Daily Quiz Attempts
User.hasMany(QuizAttempt);
QuizAttempt.belongsTo(User);

// Database Sync and Server Start
sequelize.sync().then(() => { //sequelize.sync({ alter: true }).then(() => {
    console.log('Database connected successfully!');
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}).catch((error) => {
    console.error('Unable to connect to the database:', error);
});

