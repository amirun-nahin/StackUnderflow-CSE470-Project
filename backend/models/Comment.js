const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Comment = sequelize.define('Comment', {
    text_content: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    code_snippet: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    is_deleted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    is_best_answer: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
});

module.exports = Comment;