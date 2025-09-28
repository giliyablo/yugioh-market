const admin = require('firebase-admin');

const authMiddleware = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(403).send('Unauthorized: No token provided.');
    }

    const idToken = authHeader.split('Bearer ')[1];

    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        // Attach the user's info to the request object for use in other routes
        req.user = {
            uid: decodedToken.uid,
            email: decodedToken.email,
            displayName: decodedToken.name,
            phoneNumber: decodedToken.phone_number // Note: may not always be present
        };
        next(); // User is authenticated, proceed to the next middleware/route handler
    } catch (error) {
        console.error('Error verifying auth token:', error);
        return res.status(403).send('Unauthorized: Invalid token.');
    }
};

module.exports = authMiddleware;
