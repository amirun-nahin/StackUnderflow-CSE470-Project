const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// A solution submitted by an enrolled user for a Micro-Bounty post.
// The bounty creator reviews this manually and assigns `marks`.
const BountySubmission = sequelize.define('BountySubmission', {
    code_content: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    status: {
        // PENDING  -> waiting on the bounty creator to review
        // REVIEWED -> creator has left marks + feedback
        type: DataTypes.ENUM('PENDING', 'REVIEWED'),
        defaultValue: 'PENDING',
        allowNull: false
    },
    marks: {
        // Points the creator awards after reviewing. Null until reviewed.
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    feedback: {
        // Free-text comments from the creator explaining the marks given.
        type: DataTypes.TEXT,
        allowNull: true,
    }
});

module.exports = BountySubmission;
