const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Vote = sequelize.define('Vote', {
    type: {
        type: DataTypes.ENUM('UP', 'DOWN'),
        allowNull: false,
    }
}, {
    indexes: [{ unique: true, fields: ['UserId', 'PostId'] }]
});

module.exports = Vote;