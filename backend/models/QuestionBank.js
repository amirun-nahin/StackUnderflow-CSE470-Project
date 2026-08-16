// const { DataTypes } = require('sequelize');
// const sequelize = require('../config/db');

// // Pre-loaded problems the system picks randomly for duels. Seed this table
// // with scripts/seedQuestionBank.js before duels can start.
// const QuestionBank = sequelize.define('QuestionBank', {
//     title: {
//         type: DataTypes.STRING,
//         allowNull: false,
//     },
//     description: {
//         type: DataTypes.TEXT,
//         allowNull: false,
//     },
//     language: {
//         type: DataTypes.ENUM('PYTHON', 'JAVA', 'JAVASCRIPT'),
//         allowNull: false,
//     },
//     difficulty: {
//         type: DataTypes.ENUM('EASY', 'MEDIUM', 'HARD'),
//         allowNull: false,
//         defaultValue: 'EASY'
//     },
//     starter_code: {
//         type: DataTypes.TEXT,
//         allowNull: true,
//     },
//     // Array of { input, expected_output } objects, e.g.
//     // [{ "input": "3 5", "expected_output": "8" }, ...]
//     test_cases: {
//         type: DataTypes.JSON,
//         allowNull: false,
//     }
// });

// module.exports = QuestionBank;
