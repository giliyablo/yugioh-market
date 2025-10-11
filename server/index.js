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
            console.error("❌ No authentication credentials found!");
            console.error("Please set either:");
            console.error("1. FIREBASE_SERVICE_ACCOUNT_JSON environment variable with your service account JSON");
            console.error("2. GOOGLE_APPLICATION_CREDENTIALS environment variable pointing to your service account file");
            console.error("3. Run 'gcloud auth application-default login' to set up Application Default Credentials");
            process.exit(1);
        }
    } else {
        console.log("Firebase Admin SDK already initialized");
    }
} catch (error) {
    console.error("❌ Error initializing Firebase Admin SDK:", error.message);
    if (error.message.includes('JSON')) {
        console.error("❌ Invalid JSON in FIREBASE_SERVICE_ACCOUNT_JSON. Please check your environment variable.");
    }
    process.exit(1);
}

// --- Initialize Firestore ---
const db = admin.firestore();
console.log("Firestore initialized successfully.");

// Export db for use in other modules
module.exports = { db };

// --- Initialize Express App ---
const app = express();
const PORT = process.env.PORT || 5000;

// --- Middleware ---
app.use(cors()); // Allows requests from your frontend
app.use(express.json()); // Parses incoming JSON bodies
app.use(express.urlencoded({ extended: true })); // Parses URL-encoded bodies

// Serve static files from the built client
app.use(express.static('public'));

// --- Database Connection ---
// MongoDB connection removed - now using Firestore

// --- API Routes ---
// All routes related to posts will be prefixed with /api/posts
app.use('/api/posts', require('./routes/posts'));

// --- Root Route ---
app.get('/', (req, res) => {
    res.sendFile('index.html', { root: 'public' });
});

// --- API Health Check ---
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        project: 'fourth-arena-474414-h6'
    });
});

// --- Test Firestore Connection ---
app.get('/test-firestore', async (req, res) => {
    try {
        // Test Firestore connection by trying to read from a collection
        const testCollection = db.collection('_test');
        const snapshot = await testCollection.limit(1).get();
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
