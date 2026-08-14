const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// One row per question assigned to a duel. order_index (1..question_count)
// controls the order questions are presented in.
const DuelQuestion = sequelize.define('DuelQuestion', {
    order_index: {
        type: DataTypes.INTEGER,
        allowNull: false,
    }
}, {
    indexes: [
        { unique: true, fields: ['DuelId', 'QuestionBankId'] }
    ]
});

module.exports = DuelQuestion;
