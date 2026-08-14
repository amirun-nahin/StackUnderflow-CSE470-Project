const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// A 1v1 duel. ChallengerId/OpponentId/WinnerId are set up as FKs in index.js
// (all three point at User, so they need explicit `as` aliases there).
const Duel = sequelize.define('Duel', {
    language: {
        type: DataTypes.ENUM('PYTHON', 'JAVA', 'JAVASCRIPT'),
        allowNull: false,
    },
    status: {
        // PENDING   -> invite sent, awaiting response
        // DECLINED  -> opponent said no
        // ACTIVE    -> accepted, questions assigned, duel in progress
        // COMPLETED -> both sides finished (or resolved), winner_id set
        type: DataTypes.ENUM('PENDING', 'DECLINED', 'ACTIVE', 'COMPLETED'),
        allowNull: false,
        defaultValue: 'PENDING'
    },
    question_count: {
        // How many questions this duel uses (3-5 per the spec)
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 3
    },
    started_at: {
        // Set when the invite is accepted — used for tie-breaking finish time
        type: DataTypes.DATE,
        allowNull: true,
    }
});

module.exports = Duel;
