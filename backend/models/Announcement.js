const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// An announcement posted by group leadership (admin / team manager / scrum master).
const Announcement = sequelize.define('Announcement', {
    text_content: {
        type: DataTypes.TEXT,
        allowNull: false,
    }
});

module.exports = Announcement;
