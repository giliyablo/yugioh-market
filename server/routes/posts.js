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

router.get('/', getAllPosts);
router.get('/my-posts', authMiddleware, getMyPosts);
router.post('/', authMiddleware, createPost);
router.post('/batch-list', authMiddleware, createPostsFromList);
router.put('/:id', authMiddleware, updatePost);
router.delete('/:id', authMiddleware, deletePost);

module.exports = router;
