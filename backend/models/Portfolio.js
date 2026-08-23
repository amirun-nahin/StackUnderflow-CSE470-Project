const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// One portfolio per user. `headline` is either written by the user directly
// (PUT /me) or generated via the AI endpoint (POST /me/generate).
const Portfolio = sequelize.define('Portfolio', {
    template: {
        type: DataTypes.ENUM('MINIMAL', 'MODERN', 'CLASSIC'),
        defaultValue: 'MINIMAL',
        allowNull: false
    },
    headline: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    // Used to throttle AI regeneration — see routes/portfolio.js
    last_generated_at: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    indexes: [
        { unique: true, fields: ['UserId'] }
    ]
});

module.exports = Portfolio;