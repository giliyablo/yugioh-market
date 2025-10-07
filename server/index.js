require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const mongoose = require('mongoose');
const admin = require('firebase-admin');
const postRoutes = require('./routes/posts');
const { initSocket } = require('./services/socket');

// --- Initialize Firebase Admin SDK ---
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
app.use(cors({
    origin: 'http://localhost:5173', // frontend URL
    methods: ['GET','POST','PUT','DELETE','OPTIONS'],
    allowedHeaders: ['Content-Type','Authorization'],
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Routes ---
app.use('/api/posts', postRoutes);

// --- Root Route ---
app.get('/', (req, res) => res.send('Yu-Gi-Oh! Marketplace API is running!'));

// --- Database Connection ---
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB connected successfully."))
    .catch(err => {
        console.error("MongoDB connection error:", err);
        process.exit(1);
    });

// --- Create HTTP server & initialize Socket.IO ---
const server = http.createServer(app);
initSocket(server);

// --- Start Server ---
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = { server, admin }; // export admin for auth middleware if needed
