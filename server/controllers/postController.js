const Post = require('../models/Post');
const { initiatePriceAndImageFetch } = require('../services/backgroundScraper');

// --- Create Single Post ---
exports.createPost = async (req, res) => {
    if (!req.user) return res.status(401).json({ msg: 'Unauthorized: user info missing.' });

    const { cardName, postType, price, condition, cardImageUrl, contactEmail, contactPhone } = req.body;
    const { uid, name, email: userEmail, phone_number: userPhone } = req.user;
    const displayName = name || userEmail || 'User';

    if (!cardName || !postType)
        return res.status(400).json({ msg: 'Card name and post type are required.' });

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
            price: price || null,
            condition,
            cardImageUrl: cardImageUrl || null,
            isApiPrice: !price,
        });

        const post = await newPost.save();
        res.status(201).json(post);

        // Run in background safely
        initiatePriceAndImageFetch(post._id, cardName)
            .catch(err => console.error(`Background fetch failed for ${cardName}:`, err));

    } catch (err) {
        console.error('Create Post Error:', err);
        res.status(500).json({ msg: 'Internal server error', error: err.message });
    }
};

// --- Batch Create Posts ---
exports.createPostsFromList = async (req, res) => {
    if (!req.user) return res.status(401).json({ msg: 'Unauthorized: user info missing.' });

    const { uid, name, email: userEmail, phone_number: userPhone } = req.user;
    const displayName = name || userEmail || 'User';
    const { cardNames, priceMode = 'market', fixedPrice, postType = 'sell', condition = 'Near Mint' } = req.body;

    if (!Array.isArray(cardNames) || cardNames.length === 0)
        return res.status(400).json({ msg: 'cardNames must be a non-empty array.' });

    const cardsToProcess = cardNames.map(s => String(s).trim()).filter(Boolean);

    try {
        const createdPosts = await Promise.all(cardsToProcess.map(async (cardName) => {
            const newPost = new Post({
                user: { uid, displayName, contact: { email: userEmail, phoneNumber: userPhone || null } },
                cardName,
                postType,
                price: priceMode === 'fixed' ? Number(fixedPrice) : null,
                condition,
                isApiPrice: priceMode !== 'fixed',
                cardImageUrl: null,
            });
            return await newPost.save();
        }));

        res.status(201).json({ count: createdPosts.length, items: createdPosts });

        // Background tasks
        for (const post of createdPosts) {
            const shouldFetchPrice = priceMode === 'market';
            initiatePriceAndImageFetch(post._id, post.cardName, shouldFetchPrice)
                .catch(err => console.error(`Background fetch failed for ${post.cardName}:`, err));
        }

    } catch (err) {
        console.error("Error in createPostsFromList:", err);
        res.status(500).json({ msg: 'Internal server error', error: err.message });
    }
};

// --- Other controllers ---
exports.getAllPosts = async (req, res) => { /* ... */ };
exports.getMyPosts = async (req, res) => { /* ... */ };
exports.updatePost = async (req, res) => { /* ... */ };
exports.deletePost = async (req, res) => { /* ... */ };
