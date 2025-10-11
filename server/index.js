require('dotenv').config();
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');

// --- Initialize Firebase Admin SDK ---
// This allows the server to verify user tokens and access Firestore
try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    console.log("Firebase Admin SDK initialized successfully.");
} catch (error) {
    console.error("Error initializing Firebase Admin SDK:", error);
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

// --- Database Connection ---
// MongoDB connection removed - now using Firestore

// --- API Routes ---
// All routes related to posts will be prefixed with /api/posts
app.use('/api/posts', require('./routes/posts'));

// --- Root Route ---
app.get('/', (req, res) => {
    res.send('Yu-Gi-Oh! Marketplace API is running!');
});

// --- Start Server ---
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
