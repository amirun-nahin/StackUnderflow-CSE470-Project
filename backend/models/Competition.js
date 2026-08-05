const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// A hosted coding competition. The question is written up-front by the creator
// but stays hidden from everyone (including via the API) until `start_time`.
const Competition = sequelize.define('Competition', {
    title: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    description: {
        // Public announcement text — visible immediately, unlike question_content
        type: DataTypes.TEXT,
        allowNull: true,
    },
    language: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    question_content: {
        // The actual problem statement. Hidden by the route layer until start_time.
        type: DataTypes.TEXT,
        allowNull: false,
    },
    start_time: {
        // The moment the question unlocks and the submission window opens
        type: DataTypes.DATE,
        allowNull: false,
    },
    duration_minutes: {
        // Length of the submission window starting at start_time
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    evaluation_mode: {
        // MANUAL -> creator scores each submission by hand
        // AUTO   -> reserved for future automated grading; scoring endpoint is the same either way for now
        type: DataTypes.ENUM('MANUAL', 'AUTO'),
        allowNull: false,
        defaultValue: 'MANUAL'
    }
});

module.exports = Competition;
