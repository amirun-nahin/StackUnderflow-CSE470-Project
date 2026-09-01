const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// A single piece of content the user has chosen to include in their
// portfolio — added and removed manually from the Extra page.
const PortfolioItem = sequelize.define('PortfolioItem', {
    type: {
        type: DataTypes.ENUM('PROJECT', 'SKILL', 'ACHIEVEMENT', 'EXPERIENCE', 'CUSTOM'),
        defaultValue: 'CUSTOM',
        allowNull: false
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    order: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false
    }
});

module.exports = PortfolioItem;