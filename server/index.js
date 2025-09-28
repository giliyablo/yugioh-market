// server/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const db = require('./db'); // You'll create a db connection file
const authMiddleware = require('./authMiddleware'); // Middleware to protect routes

const app = express();
app.use(cors());
app.use(express.json());

// --- ROUTES ---

// Endpoint to get all active posts (for guests and logged-in users)
app.get('/api/posts', async (req, res) => {
    try {
        const { rows } = await db.query(
            "SELECT p.*, u.display_name FROM posts p JOIN users u ON p.user_uid = u.uid WHERE p.is_active = TRUE ORDER BY p.created_at DESC"
        );
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).send("Server error fetching posts.");
    }
});

// Endpoint to create a new post (protected route)
app.post('/api/posts', authMiddleware, async (req, res) => {
    const { cardName, postType, price, condition, imageUrl } = req.body;
    const userUid = req.user.uid; // From authMiddleware
    let finalPrice = price;

    // Requirement 3: If no price, fetch from external APIs
    if (!price) {
        try {
            // NOTE: You need to find real API endpoints for these services
            const tcgResponse = await axios.get(`https://api.tcgplayer.com/v1/pricing/card/${cardName}`);
            // Fallback or average with another API
            // const cardTraderResponse = await axios.get(`https://api.cardtrader.com/...?card=${cardName}`);
            finalPrice = tcgResponse.data.marketPrice; // Example path
        } catch (apiError) {
            console.error("Failed to fetch card price:", apiError);
            // Decide what to do: return an error or post without a price
            return res.status(500).send("Could not fetch card market price.");
        }
    }

    try {
        const { rows } = await db.query(
            "INSERT INTO posts (user_uid, card_name, post_type, price, condition, card_image_url) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
            [userUid, cardName, postType, finalPrice, condition, imageUrl]
        );
        res.status(201).json(rows[0]);
    } catch (dbError) {
        console.error(dbError);
        res.status(500).send("Server error creating post.");
    }
});

// Requirement 6: Batch upload endpoint (simplified)
app.post('/api/posts/batch', authMiddleware, async (req, res) => {
    // 1. Use 'formidable' to parse the uploaded file (PDF/Image/TXT)
    // 2. If image/PDF, send to Google Cloud Vision AI to extract text (card names)
    // 3. If TXT, parse lines
    // 4. Loop through the list of extracted card names
    // 5. For each name, create a post using the logic from the '/api/posts' endpoint above
    // This is a complex background task, you might use a job queue for this.
    res.status(202).send("Batch upload received and is being processed.");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));