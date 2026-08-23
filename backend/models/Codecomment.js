const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// A single inline review comment attached to one line of a Peer Review
// post's code_snippet — like a lightweight version of GitHub's line comments.
const CodeComment = sequelize.define('CodeComment', {
    line_number: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    text_content: {
        type: DataTypes.TEXT,
        allowNull: false,
    }
});

module.exports = CodeComment;