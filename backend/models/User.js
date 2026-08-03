const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const User = sequelize.define('User', {
    // Profile - Registration
    username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: { isEmail: true },
    },
    gender: {
        type: DataTypes.ENUM('Male', 'Female', 'Other', 'Prefer not to say'),
        allowNull: false, 
    },
    phone_number: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    company_university: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    primary_language: {
        type: DataTypes.STRING,
        allowNull: true,
    },

    // Profile - After Registration
    birthdate: {
        type: DataTypes.DATEONLY, 
        allowNull: true,
    },
    address: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    social_media_links: {
        type: DataTypes.JSON, 
        allowNull: true,
    },
    github_profile: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    bio: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    field_of_interest: {
        type: DataTypes.STRING, 
        allowNull: true,
    },
    profile_picture: {
        type: DataTypes.STRING, 
        allowNull: true,
        defaultValue: 'default' 
    },
    tech_stack: {
        type: DataTypes.JSON,
        allowNull: true,
    },
    current_role: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    years_of_experience: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    availability_status: {
        type: DataTypes.ENUM('Open to Collaborate', 'Looking for Work', 'Busy', 'Just Browsing'),
        allowNull: true,
        defaultValue: 'Just Browsing'
    }
});

module.exports = User;