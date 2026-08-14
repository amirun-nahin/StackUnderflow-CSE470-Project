const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Post = sequelize.define('Post', {
    text_content: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    code_snippet: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    category: {
        type: DataTypes.ENUM('NORMAL', 'PEER_REVIEW', 'COLLAB_SLOT', 'MICRO_BOUNTY', 'REPO_REQUEST'),
        defaultValue: 'NORMAL',
        allowNull: false
    },
    language: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: 'General'
    },
    bounty_reward_points: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    bounty_deadline: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    bounty_status: {
        type: DataTypes.ENUM('OPEN', 'CLOSED'),
        allowNull: true,
        defaultValue: 'OPEN'
    },
    GroupId: {
        type: DataTypes.INTEGER,
        allowNull: true, // Null means it's a global feed post
    },
    repo_name: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    people_needed: {
        type: DataTypes.INTEGER,
        allowNull: true,
    }
});

module.exports = Post;