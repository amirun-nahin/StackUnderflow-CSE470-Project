const express = require('express');
const cors = require('cors');
require('dotenv').config();
const sequelize = require('./config/db');

const app = express();
const PORT = process.env.PORT || 3001;

// Core Middleware
app.use(cors({
    origin: 'http://localhost:5173', 
    credentials: true
}));
app.use(express.json());

// Routers
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// Fallback Route
app.use('/', (req, res) => {
    res.send("StackUnderflow API is running!");
});

// Database Sync and Server Start
sequelize.sync({ alter: true }).then(() => {
    console.log('Database connected successfully!');
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}).catch((error) => {
    console.error('Unable to connect to the database:', error);
});