const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// One row per (User, Competition) — see the unique index below.
// `first_submitted_at` never changes after creation, even if the user edits
// their code before the window closes, so early submissions stay provable.
const CompetitionSubmission = sequelize.define('CompetitionSubmission', {
    code_content: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    first_submitted_at: {
        type: DataTypes.DATE,
        allowNull: false,
    },
    time_complexity: {
        // Filled in by the evaluator during review (e.g. "O(n log n)")
        type: DataTypes.STRING,
        allowNull: true,
    },
    score: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    feedback: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    status: {
        type: DataTypes.ENUM('PENDING', 'EVALUATED'),
        allowNull: false,
        defaultValue: 'PENDING'
    }
}, {
    indexes: [
        // One submission record per user per competition (edits update the same row)
        { unique: true, fields: ['UserId', 'CompetitionId'] }
    ]
});

module.exports = CompetitionSubmission;
