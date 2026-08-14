const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        dialect: 'mysql',
        logging: false, 
    }
);
// sequelize.sync({ alter: true }) // Updates tables to match models without dropping them
//   .then(() => console.log('Database synced'))
//   .catch((err) => console.error(err));
module.exports = sequelize;