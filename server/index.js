require('dotenv').config();
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');

// --- Initialize Firebase Admin SDK ---
try {
    if (admin.apps.length === 0) {
        if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
            console.log("Using service account from environment variable...");
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                projectId: 'fourth-arena-474414-h6'
            });
            console.log("Firebase Admin SDK initialized successfully for project: fourth-arena-474414-h6");
        } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
            console.log("Using Application Default Credentials...");
            admin.initializeApp({
                projectId: 'fourth-arena-474414-h6'
            });
            console.log("Firebase Admin SDK initialized with Application Default Credentials for project: fourth-arena-474414-h6");
        } else {
            console.warn("⚠️  No Firebase credentials found - running in development/test mode");
        }
    } else {
        console.log("Firebase Admin SDK already initialized");
    }
} catch (error) {
    console.warn("⚠️  Error initializing Firebase Admin SDK:", error.message);
}

// --- Initialize Firestore ---
let db;
try {
    if (admin.apps.length > 0) {
        db = admin.firestore();
        console.log("Firestore initialized successfully.");
    } else {
        console.warn("⚠️  Firebase not initialized - using mock database for tests");
        db = null;
    }
} catch (error) {
    console.warn("⚠️  Error initializing Firestore:", error.message);
    db = null;
}

// --- Initialize Express App ---
const app = express();
const PORT = process.env.PORT || 5000;

// --- Middleware ---
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- API Routes ---
app.use('/api/', require('./routes/posts'));

// --- Root Route ---
app.get('/', (req, res) => {
    res.status(200).send('TCG Marketplace API Server is running.');
});

// --- API Health Check ---
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString()
    });
});

// --- Cloud Run Health Check ---
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// --- Test Firestore Connection ---
app.get('/test-firestore', async (req, res) => {
    try {
        if (!db) throw new Error('Firestore not initialized');
        const testCollection = db.collection('_test');
        await testCollection.limit(1).get();
        res.json({ 
            status: 'success', 
            message: 'Firestore connection successful'
        });
    } catch (error) {
        console.error('Firestore test failed:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Firestore connection failed',
            error: error.message
        });
    }
});

// --- Start Server ---
// This check ensures the server only starts listening when the file is run directly
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

// Export the app for testing purposes
module.exports = { db, app };

