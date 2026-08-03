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
        type: DataTypes.ENUM('NORMAL', 'PEER_REVIEW', 'COLLAB_SLOT', 'MICRO_BOUNTY'),
        defaultValue: 'NORMAL',
        allowNull: false
    },
    language: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: 'General'
    }
});

module.exports = Post;