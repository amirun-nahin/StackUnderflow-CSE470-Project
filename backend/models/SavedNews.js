const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const SavedNews = sequelize.define('SavedNews', {
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    url: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    source: {
        type: DataTypes.STRING,
        defaultValue: 'Dev.to'
    },
    external_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    }
});

module.exports = SavedNews;