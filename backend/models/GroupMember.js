const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// Pivot table to track membership, roles, and approval status
const GroupMember = sequelize.define('GroupMember', {
    role: {
        type: DataTypes.ENUM('ADMIN', 'MEMBER'),
        defaultValue: 'MEMBER',
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('PENDING', 'APPROVED'),
        defaultValue: 'APPROVED',
        allowNull: false
    }
}, {
    indexes: [
        { unique: true, fields: ['UserId', 'GroupId'] }
    ]
});

module.exports = GroupMember;