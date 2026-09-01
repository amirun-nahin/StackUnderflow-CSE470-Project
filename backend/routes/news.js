const express = require('express');
const router = express.Router();
const newsController = require('../controllers/news');
const { validateToken } = require('../middlewares/AuthMiddleware');

router.get('/', validateToken, newsController.getNews);
router.post('/bookmark', validateToken, newsController.toggleBookmark);
router.get('/bookmarks', validateToken, newsController.getBookmarks);
router.get('/article/:id', validateToken, newsController.getArticleById);

module.exports = router;