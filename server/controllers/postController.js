const Post = require('../models/Post');
const axios = require('axios');
const formidable = require('formidable');

// --- Helper function to get TCGplayer market price ---
// NOTE: This is a simplified example. A real implementation needs proper API authentication.
const getMarketPrice = async (cardName) => {
    try {
        // In a real scenario, you'd implement OAuth2 to get a bearer token for TCGplayer's API.
        // This is a placeholder for the logic.
        console.log(`Fetching market price for: ${cardName}`);
        
        // This endpoint is fictional. You need to use the actual TCGplayer API structure.
        // const response = await axios.get(`https://api.tcgplayer.com/v1.39.0/pricing/product/${productId}`, {
        //     headers: { 'Authorization': `Bearer YOUR_ACCESS_TOKEN` }
        // });
        
        // Returning a random price for demonstration purposes.
        const randomPrice = (Math.random() * (50 - 1) + 1).toFixed(2);
        return randomPrice;

    } catch (error) {
        console.error("Failed to fetch card price from TCGplayer API:", error.message);
        return null; // Return null if the API call fails
    }
};


// --- Controller for GET /api/posts ---
exports.getAllPosts = async (req, res) => {
    try {
        // Find all active posts and sort them by creation date, newest first
        const posts = await Post.find({ isActive: true }).sort({ createdAt: -1 });
        res.json(posts);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// --- Controller for POST /api/posts ---
exports.createPost = async (req, res) => {
    const { cardName, postType, price, condition, cardImageUrl, contactEmail, contactPhone } = req.body;
    const { uid, displayName } = req.user; // From authMiddleware

    if (!cardName || !postType) {
        return res.status(400).json({ msg: 'Card name and post type are required.' });
    }
    
    let finalPrice = price;
    let isApiPrice = false;

    // If no price is provided, fetch it from the API
    if (price === undefined || price === null || price === '') {
        finalPrice = await getMarketPrice(cardName);
        if (finalPrice === null) {
            return res.status(500).json({ msg: 'Could not retrieve market price. Please set a price manually.' });
        }
        isApiPrice = true;
    }

    try {
        const newPost = new Post({
            user: {
                uid,
                displayName,
                contact: {
                    email: contactEmail,
                    phoneNumber: contactPhone
                }
            },
            cardName,
            postType,
            price: finalPrice,
            condition,
            cardImageUrl,
            isApiPrice,
        });

        const post = await newPost.save();
        res.status(201).json(post);

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// --- Controller for POST /api/posts/batch ---
// This is a placeholder for a very complex feature.
exports.createBatchPosts = async (req, res) => {
    const form = formidable({});
    
    form.parse(req, (err, fields, files) => {
        if (err) {
            console.error('Error parsing form data:', err);
            return res.status(500).send('Error processing file upload.');
        }

        // TODO: Implement the file processing logic here.
        // 1. Identify the file type (PDF, image, TXT).
        // 2. If image/PDF, send to a service like Google Cloud Vision AI to extract text.
        // 3. Parse the extracted text or TXT file to get a list of card names.
        // 4. For each card name:
        //    a. Call getMarketPrice().
        //    b. Create a new Post document.
        //    c. Save it to the database using the same logic as createPost.
        // 5. This should ideally be handled as a background job to avoid long request timeouts.

        console.log('Batch file received (implementation pending):', files.batchFile);
        res.status(202).json({ 
            msg: 'Batch upload received and is being processed. This feature is a work in progress.' 
        });
    });
};
