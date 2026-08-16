const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// A participant's answer to one DuelQuestion. Grading is instant and
// server-authoritative (see routes/duel.js) — there is no PENDING/manual
// review state here, unlike bounty and competition submissions.
const DuelSubmission = sequelize.define('DuelSubmission', {
    selected_option_index: {
        // Null if the player never answered before the 15s window closed
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    is_correct: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    time_taken_ms: {
        // Milliseconds between the question's started_at and this submission.
        // Null if timed out. Used to determine who answered first among
        // correct answers.
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    points_earned: {
        // 15 if this is the fastest correct answer for the question, else 0.
        // Recomputed deterministically whenever both players' state is known.
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    status: {
        type: DataTypes.ENUM('ANSWERED', 'TIMED_OUT'),
        allowNull: false,
        defaultValue: 'ANSWERED'
    }
}, {
    indexes: [
        { unique: true, fields: ['UserId', 'DuelQuestionId'] }
    ]
});

module.exports = DuelSubmission;
