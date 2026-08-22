const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// A scheduled meeting within a collaboration group's calendar.
const Meeting = sequelize.define('Meeting', {
    description: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    scheduled_at: {
        type: DataTypes.DATE,
        allowNull: false,
    }
});

module.exports = Meeting;
