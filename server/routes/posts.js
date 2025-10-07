const express = require('express');
const router = express.Router();
const {
    getAllPosts,
    createPost,
    createPostsFromList,
    updatePost,
    deletePost,
    getMyPosts,
} = require('../controllers/postController');
const authMiddleware = require('../middleware/authMiddleware');

// @route   GET /api/posts
// @desc    Get all active posts
// @access  Public
router.get('/', getAllPosts);

// @route   GET /api/posts/my-posts
// @desc    Get posts for the currently authenticated user
// @access  Private
router.get('/my-posts', authMiddleware, getMyPosts);

// @route   POST /api/posts
// @desc    Create a single new post
// @access  Private
router.post('/', authMiddleware, createPost);

// @route   POST /api/posts/batch-list
// @desc    Create multiple posts from a list of card names
// @access  Private
router.post('/batch-list', authMiddleware, createPostsFromList);

// @route   PUT /api/posts/:id
// @desc    Update a post (owner only)
// @access  Private
router.put('/:id', authMiddleware, updatePost);

// @route   DELETE /api/posts/:id
// @desc    Delete a post (owner only)
// @access  Private
router.delete('/:id', authMiddleware, deletePost);

module.exports = router;
