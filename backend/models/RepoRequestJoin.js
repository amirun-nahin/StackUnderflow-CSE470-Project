const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// Represents a user "joining" a Repository Request (a Post with category REPO_REQUEST).
// One row per (User, Post) pair — enforced by the unique index below.
const RepoRequestJoin = sequelize.define('RepoRequestJoin', {
    joined_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false
    }
}, {
    indexes: [
        { unique: true, fields: ['UserId', 'PostId'] }
    ]
});

module.exports = RepoRequestJoin;