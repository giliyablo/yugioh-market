require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const mongoose = require('mongoose');
const admin = require('firebase-admin');
const postRoutes = require('./routes/posts');
const { initSocket } = require('./services/socket.js');

// --- Environment Validation ---
if (!process.env.MONGO_URI || !process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    console.error("Missing required environment variables.");
    process.exit(1);
}

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
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// --- Middleware ---
// CORS setup
app.use(cors({
    origin: 'http://localhost:5173',  // allow your frontend
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true // only if you need to send cookies/auth headers
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Routes ---
app.use('/api/posts', postRoutes);

app.get('/', (req, res) => {
    res.send('Yu-Gi-Oh! Marketplace API is running!');
});

// --- Initialize Socket.IO ---
initSocket(server);

// --- Database Connection ---
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log("MongoDB connected successfully.");
        server.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    })
    .catch(err => {
        console.error("MongoDB connection error:", err);
        process.exit(1);
    });

module.exports = { server };
