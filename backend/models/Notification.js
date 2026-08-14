const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// Generic notification row. `type` + `link` let the frontend route the click
// anywhere (e.g. straight into a duel), and this table can be reused later
// for other notification kinds beyond duels.
const Notification = sequelize.define('Notification', {
    type: {
        type: DataTypes.STRING,
        allowNull: false,
        // e.g. 'DUEL_INVITE', 'DUEL_ACCEPTED', 'DUEL_COMPLETED'
    },
    message: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    link: {
        // Frontend route to send the user to on click, e.g. "/duel/42"
        type: DataTypes.STRING,
        allowNull: true,
    },
    is_read: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    }
});

module.exports = Notification;
