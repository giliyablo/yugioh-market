const Post = require('../models/Post');
const { initiatePriceAndImageFetch } = require('../services/backgroundScraper');

// Create a single post
exports.createPost = async (req, res) => {
    const { cardName, postType, price, condition } = req.body;
    const { uid, name, email: userEmail } = req.user;
    const displayName = name || userEmail || 'User';

    if (!cardName || !postType) return res.status(400).json({ msg: 'Card name and post type required.' });

    try {
        const newPost = new Post({
            user: { uid, displayName, contact: { email: userEmail } },
            cardName,
            postType,
            price: price || null,
            condition,
            cardImageUrl: null,
            isApiPrice: !price
        });

        const post = await newPost.save();
        res.status(201).json(post);

        // Lazy background fetch
        initiatePriceAndImageFetch(post._id, cardName);

    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// Get all posts
exports.getAllPosts = async (req, res) => {
    try {
        const posts = await Post.find().sort({ createdAt: -1 }).limit(50);
        res.json(posts);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// Get posts for authenticated user
exports.getMyPosts = async (req, res) => {
    try {
        const posts = await Post.find({ 'user.uid': req.user.uid }).sort({ createdAt: -1 });
        res.json(posts);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// Update post
exports.updatePost = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ msg: 'Post not found' });
        if (post.user.uid !== req.user.uid) return res.status(403).json({ msg: 'Not authorized' });

        const updatedPost = await Post.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
        res.json(updatedPost);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// Delete post
exports.deletePost = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ msg: 'Post not found' });
        if (post.user.uid !== req.user.uid) return res.status(403).json({ msg: 'Not authorized' });

        await Post.findByIdAndDelete(req.params.id);
        res.json({ msg: 'Post deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

exports.createPostsFromList = async (req, res) => {
    const { uid, name, email, phone_number } = req.user;
    const displayName = name || email || 'User';
    const { cardNames, priceMode = 'market', fixedPrice, postType = 'sell', condition = 'Near Mint' } = req.body;

    if (!Array.isArray(cardNames) || cardNames.length === 0) {
        return res.status(400).json({ msg: 'cardNames must be a non-empty array.' });
    }

    const cardsToProcess = cardNames.map(s => String(s).trim()).filter(Boolean);
    const createdPosts = [];

    try {
        // Create posts instantly
        for (const cardName of cardsToProcess) {
            const newPost = new Post({
                user: {
                    uid,
                    displayName,
                    contact: { email, phoneNumber: phone_number || null }
                },
                cardName,
                postType,
                price: priceMode === 'fixed' ? Number(fixedPrice) : null,
                condition,
                isApiPrice: priceMode !== 'fixed',
                cardImageUrl: null
            });

            const savedPost = await newPost.save();
            createdPosts.push(savedPost);
        }

        // Respond immediately
        res.status(201).json({ count: createdPosts.length, items: createdPosts });

        // --- Start lazy background jobs ---
        for (const post of createdPosts) {
            const shouldFetchPrice = priceMode === 'market';
            initiatePriceAndImageFetch(post._id, post.cardName, shouldFetchPrice);
        }

    } catch (err) {
        console.error("Error in createPostsFromList:", err.message);
        res.status(500).send('Server Error');
    }
};
