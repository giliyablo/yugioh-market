require('dotenv').config();
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');

// --- Initialize Firebase Admin SDK ---
// This allows the server to verify user tokens and access Firestore
try {
    // Check if Firebase Admin SDK is already initialized
    if (admin.apps.length === 0) {
        // Try to use service account from environment variable first
        if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
            console.log("Using service account from environment variable...");
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                projectId: 'fourth-arena-474414-h6'
            });
            console.log("Firebase Admin SDK initialized successfully for project: fourth-arena-474414-h6");
        } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
            console.log("Using Application Default Credentials from GOOGLE_APPLICATION_CREDENTIALS...");
            admin.initializeApp({
                projectId: 'fourth-arena-474414-h6'
            });
            console.log("Firebase Admin SDK initialized with Application Default Credentials for project: fourth-arena-474414-h6");
        } else {
            console.warn("⚠️  No Firebase credentials found - running in development mode");
            console.warn("⚠️  Authentication and database features will not work");
            console.warn("⚠️  To enable full functionality, set FIREBASE_SERVICE_ACCOUNT_JSON");
        }
    } else {
        console.log("Firebase Admin SDK already initialized");
    }
} catch (error) {
    console.warn("⚠️  Error initializing Firebase Admin SDK:", error.message);
    console.warn("⚠️  Running in development mode without Firebase");
    if (error.message.includes('JSON')) {
        console.warn("⚠️  Invalid JSON in FIREBASE_SERVICE_ACCOUNT_JSON. Running without Firebase.");
    }
}

// --- Initialize Firestore ---
let db;
try {
    if (admin.apps.length > 0) {
        db = admin.firestore();
        console.log("Firestore initialized successfully.");
    } else {
        console.warn("⚠️  Firebase not initialized - using mock database");
        db = null; // Will be handled in routes
    }
} catch (error) {
    console.warn("⚠️  Error initializing Firestore:", error.message);
    db = null;
}

// Export db for use in other modules
module.exports = { db };

// --- Initialize Express App ---
const app = express();
const PORT = process.env.PORT || 5000;

// --- Middleware ---
app.use(cors()); // Allows requests from your frontend
app.use(express.json()); // Parses incoming JSON bodies
app.use(express.urlencoded({ extended: true })); // Parses URL-encoded bodies

// --- API Routes ---
// All routes related to posts will be prefixed with /api
app.use('/api/posts', require('./routes/posts'));

// --- Root Route ---
// This is now just a simple health/status check for the root.
app.get('/', (req, res) => {
    res.status(200).send('TCG Marketplace Server is running.');
});

// --- API Health Check ---
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        project: 'fourth-arena-474414-h6'
    });
});

// --- Cloud Run Health Check (if needed, though /api/health is better) ---
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// --- Test Firestore Connection ---
app.get('/test-firestore', async (req, res) => {
    try {
        if (!db) throw new Error('Firestore not initialized');
        // Test Firestore connection by trying to read from a collection
        const testCollection = db.collection('_test');
        await testCollection.limit(1).get();
        res.json({ 
            status: 'success', 
            message: 'Firestore connection successful',
            projectId: 'fourth-arena-474414-h6',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Firestore test failed:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Firestore connection failed',
            error: error.message,
            code: error.code
        });
    }
});

// --- Start Server ---
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
