const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// A participant's answer to one DuelQuestion.
// test_cases_passed/total_test_cases/status are filled in by the code
// execution step (see routes/duel.js — runTestCases stub).
const DuelSubmission = sequelize.define('DuelSubmission', {
    code_content: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    status: {
        // PENDING -> saved but not yet run against test cases
        // PASSED  -> all test cases passed
        // FAILED  -> at least one test case failed
        type: DataTypes.ENUM('PENDING', 'PASSED', 'FAILED'),
        allowNull: false,
        defaultValue: 'PENDING'
    },
    test_cases_passed: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    total_test_cases: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    submitted_at: {
        type: DataTypes.DATE,
        allowNull: false,
    }
}, {
    indexes: [
        // One submission per user per question (resubmit updates the same row)
        { unique: true, fields: ['UserId', 'DuelQuestionId'] }
    ]
});

module.exports = DuelSubmission;
