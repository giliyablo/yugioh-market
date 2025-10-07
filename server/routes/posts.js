const express = require('express');
const router = express.Router();
const { sseHandler } = require('../services/sse');
const {
    getAllPosts,
    createPost,
    createBatchPosts,
    createPostsFromList,
    updatePost,
    deletePost,
    getMyPosts,
    getCardImageFromWiki,
    getCardPriceFromTCG
} = require('../controllers/postController');
const authMiddleware = require('../middleware/authMiddleware');

// @route   GET /api/posts
// @desc    Get all active posts
// @access  Public
router.get('/', getAllPosts);

// @route   GET /api/posts/events
// @desc    SSE stream for post updates
// @access  Public (client should authenticate requests as needed)
router.get('/events', sseHandler);

// @route   GET /api/posts/my-posts
// @desc    Get posts for the currently authenticated user
// @access  Private
router.get('/my-posts', authMiddleware, getMyPosts);

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

// @route   POST /api/posts/fetch-image
// @desc    Returns an image URL for a given card name by scraping
// @access  Private
router.post('/fetch-image', authMiddleware, getCardImageFromWiki);

// @route   POST /api/posts/fetch-price
// @desc    Returns a market price for a given card name by scraping
// @access  Private
router.post('/fetch-price', authMiddleware, getCardPriceFromTCG);

// @route   PUT /api/posts/:id
// @desc    Update a post (owner only)
// @access  Private
router.put('/:id', authMiddleware, updatePost);

// @route   DELETE /api/posts/:id
// @desc    Delete a post (owner only)
// @access  Private
router.delete('/:id', authMiddleware, deletePost);

module.exports = router;

