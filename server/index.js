require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const mongoose = require('mongoose');
const admin = require('firebase-admin');
const postRoutes = require('./routes/posts');
const { initSocket } = require('./services/socket');

// --- Firebase Admin SDK ---
try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    console.log("Firebase Admin initialized.");
} catch (error) {
    console.error("Firebase Admin init error:", error);
    process.exit(1);
}

// --- Express App ---
const app = express();
const PORT = process.env.PORT || 5000;

// --- Middleware ---
app.use(cors({
    origin: 'http://localhost:5173',
    methods: ['GET','POST','PUT','DELETE','OPTIONS'],
    allowedHeaders: ['Content-Type','Authorization'],
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Routes ---
app.use('/api/posts', postRoutes);

// --- Root route ---
app.get('/', (req, res) => res.send('Yu-Gi-Oh! Marketplace API running!'));

// --- MongoDB ---
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB connected."))
    .catch(err => {
        console.error("MongoDB connection error:", err);
        process.exit(1);
    });

// --- HTTP server + Socket.IO ---
const server = http.createServer(app);
initSocket(server);

// --- Start server ---
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = { server, admin };
