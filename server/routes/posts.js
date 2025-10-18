const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const { cardDataQueue } = require('../../worker'); // Import the queue

// --- Public Routes ---
router.get('/', postController.getPosts);

// --- Protected Routes (User must be logged in) ---
router.get('/my-posts', authMiddleware, postController.getMyPosts);
router.post('/', authMiddleware, postController.createPost);
router.put('/:id', authMiddleware, postController.updatePost);
router.delete('/:id', authMiddleware, postController.deletePost);

// Batch creation routes
router.post('/batch', authMiddleware, postController.createBatchPosts);
router.post('/batch-list', authMiddleware, postController.createPostsFromList);

// --- Admin Routes ---
router.post('/admin/batch-whatsapp', authMiddleware, adminMiddleware, postController.createPostsFromWhatsapp);

// Route to trigger the worker
router.post('/fetch-card', authMiddleware, async (req, res) => {
    const { cardName } = req.body;
    if (!cardName) {
        return res.status(400).send('Card name is required');
    }

    try {
        // Add a job to the queue
        await cardDataQueue.add('fetch-card-data', { cardName });
        res.status(202).json({ message: `Job accepted for card: ${cardName}` });
    } catch (error) {
        console.error('Failed to enqueue job:', error);
        res.status(500).send('Failed to enqueue job');
    }
});

module.exports = router;
