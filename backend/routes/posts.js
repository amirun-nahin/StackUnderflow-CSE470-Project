const express = require('express');
const router = express.Router();
const postController = require('../controllers/posts');
const { validateToken } = require('../middlewares/AuthMiddleware');

// Feed Routes
router.get('/feed', postController.getFeed);
router.get('/feed/following', validateToken, postController.getFollowingFeed);

router.get('/:postId', validateToken, postController.getSinglePost);
router.post('/create', validateToken, postController.createPost);
router.post('/:postId/vote', validateToken, postController.votePost);
router.post('/:postId/comment', validateToken, postController.createComment);
router.post('/:postId/code-comments', validateToken, postController.createCodeComment);
router.delete('/:postId/comment/:commentId', validateToken, postController.deleteComment);
router.put('/:postId/comment/:commentId/best-answer', validateToken, postController.markBestAnswer);
router.put('/:postId/flag-duplicate', validateToken, postController.flagDuplicate);
router.delete('/:postId/flag-duplicate', validateToken, postController.dismissDuplicateFlag);
router.post('/:postId/suggest-best-answer', validateToken, postController.suggestBestAnswer);

module.exports = router;