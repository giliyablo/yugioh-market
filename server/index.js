require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const admin = require('firebase-admin');

// --- Initialize Firebase Admin SDK ---
// This allows the server to verify user tokens
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

// --- Initialize Express App ---
const app = express();
const PORT = process.env.PORT || 5000;

// --- Middleware ---
app.use(cors()); // Allows requests from your frontend
app.use(express.json()); // Parses incoming JSON bodies
app.use(express.urlencoded({ extended: true })); // Parses URL-encoded bodies

// --- Database Connection ---
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB connected successfully."))
    .catch(err => {
        console.error("MongoDB connection error:", err);
        process.exit(1);
    });

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
