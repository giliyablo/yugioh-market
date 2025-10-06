const express = require('express');
const router = express.Router();
const {
    getAllPosts,
    createPost,
    createBatchPosts,
    createPostsFromList
} = require('../controllers/postController');
const authMiddleware = require('../middleware/authMiddleware');

// @route   GET /api/posts
// @desc    Get all active posts
// @access  Public
router.get('/', getAllPosts);

// @route   POST /api/posts
// @desc    Create a single new post
// @access  Private (Requires authentication)
router.post('/', authMiddleware, createPost);

// @route   POST /api/posts/batch
// @desc    Create multiple posts from a file upload
// @access  Private (Requires authentication)
// Note: This is a complex endpoint and the controller has a placeholder implementation.
router.post('/batch', authMiddleware, createBatchPosts);

// @route   POST /api/posts/batch-list
// @desc    Create multiple posts from a list of card names
// @access  Private (Requires authentication)
router.post('/batch-list', authMiddleware, createPostsFromList);

module.exports = router;
