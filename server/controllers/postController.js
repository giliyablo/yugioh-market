const Post = require('../models/Post');
const { 
    initiatePriceAndImageFetch 
} = require('../services/backgroundScraper'); // We will create this new service file

// --- Controller for POST /api/posts ---
// Creates a post instantly and starts background jobs for price/image fetching.
exports.createPost = async (req, res) => {
    const { cardName, postType, price, condition, cardImageUrl, contactEmail, contactPhone } = req.body;
    const { uid, name, email: userEmail, phone_number: userPhone } = req.user;
    const displayName = name || userEmail || 'User';

    if (!cardName || !postType) {
        return res.status(400).json({ msg: 'Card name and post type are required.' });
    }
    
    try {
        const newPost = new Post({
            user: {
                uid,
                displayName,
                contact: {
                    email: contactEmail || userEmail || null,
                    phoneNumber: contactPhone || userPhone || null,
                }
            },
            cardName,
            postType,
            // Price is initially null or the user-provided one.
            price: price || null, 
            condition,
            // Image is initially null or the user-provided one.
            cardImageUrl: cardImageUrl || null, 
            isApiPrice: !!price ? false : true, // It's an API price if the user didn't provide one
        });

        const post = await newPost.save();

        // Respond to the client immediately with the newly created post.
        res.status(201).json(post);

        // --- Start Background Task ---
        // Now, start the slow scraping process in the background. We don't wait for this.
        initiatePriceAndImageFetch(post._id, cardName);

    } catch (err) {
        console.error('Create Post Error:', err.message);
        res.status(500).send('Server Error');
    }
};

// --- Controller for POST /api/posts/batch-list ---
// Creates multiple posts instantly and starts background jobs for each.
exports.createPostsFromList = async (req, res) => {
    const { uid, name, email: userEmail, phone_number: userPhone } = req.user;
    const displayName = name || userEmail || 'User';
    const { cardNames, priceMode = 'market', fixedPrice, postType = 'sell', condition = 'Near Mint' } = req.body;

    if (!Array.isArray(cardNames) || cardNames.length === 0) {
        return res.status(400).json({ msg: 'cardNames must be a non-empty array.' });
    }

    const cardsToProcess = cardNames.map(s => String(s).trim()).filter(Boolean);
    const createdPosts = [];

    try {
        // Loop through and create each post document instantly
        for (const cardName of cardsToProcess) {
            const newPost = new Post({
                user: { uid, displayName, contact: { email: userEmail, phoneNumber: userPhone || null } },
                cardName,
                postType,
                price: priceMode === 'fixed' ? Number(fixedPrice) : null,
                condition,
                isApiPrice: priceMode !== 'fixed',
                cardImageUrl: null,
            });
            const savedPost = await newPost.save();
            createdPosts.push(savedPost);
        }

        // Respond to the client immediately with all created posts.
        res.status(201).json({ count: createdPosts.length, items: createdPosts });
        
        // --- Start Background Tasks ---
        // Now, iterate and start a background job for each new post.
        // This runs after the response has been sent.
        for (const post of createdPosts) {
             // We only fetch market price if the user requested it.
            const shouldFetchPrice = priceMode === 'market';
            initiatePriceAndImageFetch(post._id, post.cardName, shouldFetchPrice);
        }

    } catch (err) {
        console.error("Error in createPostsFromList:", err.message);
        res.status(500).send('Server Error');
    }
};


// --- All other controller functions (getAllPosts, updatePost, etc.) remain the same ---
// ... (paste your existing getAllPosts, getMyPosts, updatePost, deletePost, etc., here)
exports.getAllPosts = async (req, res) => { /* ... your existing code ... */ };
exports.getMyPosts = async (req, res) => { /* ... your existing code ... */ };
exports.updatePost = async (req, res) => { /* ... your existing code ... */ };
exports.deletePost = async (req, res) => { /* ... your existing code ... */ };
