const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const QuizAttempt = sequelize.define('QuizAttempt', {
    date_played: {
        type: DataTypes.STRING, // Stored as "YYYY-MM-DD"
        allowNull: false
    },
    score: {
        type: DataTypes.INTEGER,
        allowNull: false
    }
});

module.exports = QuizAttempt;