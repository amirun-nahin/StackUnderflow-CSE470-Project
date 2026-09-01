const express = require('express');
const router = express.Router();
const userController = require('../controllers/users');
const { validateToken } = require('../middlewares/AuthMiddleware');

router.get('/', validateToken, userController.getAllUsers);
router.get('/:username', validateToken, userController.getProfile);
router.post('/:username/follow', validateToken, userController.toggleFollow);
router.put('/update', validateToken, userController.updateProfile);

module.exports = router;