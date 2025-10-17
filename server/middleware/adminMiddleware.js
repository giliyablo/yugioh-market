const { postsService } = require('../services/firestoreService');

const adminMiddleware = async (req, res, next) => {
    try {
        // We assume authMiddleware has already run and attached req.user
        if (!req.user || !req.user.uid) {
            return res.status(401).send('Authentication required.');
        }

        const isAdmin = await postsService.isUserAdmin(req.user.uid);
        if (!isAdmin) {
            return res.status(403).send('Forbidden: Admin privileges required.');
        }

        next();
    } catch (error) {
        console.error('Error verifying admin status:', error);
        res.status(500).send('Internal server error while verifying admin status.');
    }
};

module.exports = adminMiddleware;