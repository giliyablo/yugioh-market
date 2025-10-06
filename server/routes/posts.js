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

// @route   GET /api/posts/image
// @desc    Returns an image URL for a given card name by scraping Yugipedia
// @access  Public
router.get('/image', async (req, res) => {
    const { cardName } = req.query;
    if (!cardName) return res.status(400).json({ message: 'cardName is required' });
    try {
        const { getCardImageFromYugipedia } = require('../controllers/postController');
        const url = await getCardImageFromYugipedia(cardName);
        if (url) return res.json({ imageUrl: url });
        return res.status(404).json({ message: 'Image not found' });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ message: 'Failed to fetch card image' });
    }
});

module.exports = router;
