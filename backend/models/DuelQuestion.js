const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// One row per question assigned to a duel. The question CONTENT is
// hardcoded in routes/duel.js (see the QUESTIONS array) — this table only
// tracks which question_id was assigned, its order, and exactly when its
// 15-second window opens, so both players see a synchronized countdown
// regardless of their own client clock.
const DuelQuestion = sequelize.define('DuelQuestion', {
    question_id: {
        // References an id in the hardcoded QUESTIONS array, e.g. "py-q3"
        type: DataTypes.STRING,
        allowNull: false,
    },
    order_index: {
        // 0-based position in the duel's question sequence
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    started_at: {
        // Server-authoritative moment this question's timer begins.
        // Precomputed for all questions the instant the duel is accepted:
        // duel.started_at + (order_index * duration_seconds * 1000)
        type: DataTypes.DATE,
        allowNull: false,
    },
    duration_seconds: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 15
    }
}, {
    indexes: [
        { unique: true, fields: ['DuelId', 'order_index'] }
    ]
});

module.exports = DuelQuestion;
