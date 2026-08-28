const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// One portfolio per user. `headline` is a short summary the user writes
// themselves — no AI involved, keeps this feature free to regenerate.
const Portfolio = sequelize.define('Portfolio', {
    template: {
        type: DataTypes.ENUM('MINIMAL', 'MODERN', 'CLASSIC'),
        defaultValue: 'MINIMAL',
        allowNull: false
    },
    headline: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    indexes: [
        { unique: true, fields: ['UserId'] }
    ]
});

module.exports = Portfolio;