const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// Represents a user "signing up" to attempt a Micro-Bounty (a Post with category MICRO_BOUNTY).
// One row per (User, Post) pair — enforced by the unique index below.
const BountyEnrollment = sequelize.define('BountyEnrollment', {
    status: {
        // ENROLLED -> user has joined but not submitted yet
        // SUBMITTED -> user has sent in a solution (see BountySubmission)
        // COMPLETED -> creator has reviewed and awarded marks
        type: DataTypes.ENUM('ENROLLED', 'SUBMITTED', 'COMPLETED'),
        defaultValue: 'ENROLLED',
        allowNull: false
    }
}, {
    indexes: [
        // A user can only enroll in a given bounty once
        { unique: true, fields: ['UserId', 'PostId'] }
    ]
});

module.exports = BountyEnrollment;
