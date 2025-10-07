const Post = require('../models/Post');
const axios = require('axios');
const formidable = require('formidable');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const { enqueue } = require('../services/jobs');
const { getMarketPrice, getCardImageFromYugipedia } = require('../services/cardData');

// Helpers moved to services/cardData to avoid circular deps


// --- Controller for GET /api/posts ---
exports.getAllPosts = async (req, res) => {
    try {
        const {
            q,               // search by card name (partial, case-insensitive)
            user,            // search by user uid or displayName (partial)
            sort = 'latest', // latest | cheapest | alpha
            sortBy,          // optional: field name to sort by
            sortDir,         // optional: asc | desc
            page = 1,
            limit = 20
        } = req.query;

        const pageNum = Math.max(parseInt(page, 10) || 1, 1);
        const pageSize = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);

        const filter = { isActive: true };
        if (q && typeof q === 'string') {
            filter.cardName = { $regex: q, $options: 'i' };
        }
        if (user && typeof user === 'string') {
            // Match either uid exactly or displayName partially (case-insensitive)
            filter.$or = [
                { 'user.uid': user },
                { 'user.displayName': { $regex: user, $options: 'i' } }
            ];
        }

        let sortSpec = { createdAt: -1 }; // default latest
        if (sortBy) {
            const dir = (String(sortDir).toLowerCase() === 'asc') ? 1 : -1;
            const allowed = new Set(['createdAt','price','cardName','postType','condition','user.displayName','user.contact.phoneNumber']);
            if (allowed.has(sortBy)) {
                sortSpec = { [sortBy]: dir };
            }
        } else {
            if (sort === 'cheapest') {
                sortSpec = { price: 1, createdAt: -1 };
            } else if (sort === 'alpha') {
                sortSpec = { cardName: 1 };
            }
        }

        const [items, total] = await Promise.all([
            Post.find(filter)
                .sort(sortSpec)
                .skip((pageNum - 1) * pageSize)
                .limit(pageSize),
            Post.countDocuments(filter)
        ]);

        // Remove blocking backfill work here; enrichment happens via background jobs now

        res.json({
            items,
            total,
            page: pageNum,
            limit: pageSize,
            totalPages: Math.ceil(total / pageSize)
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// --- Controller for POST /api/posts ---
exports.createPost = async (req, res) => {
    const { cardName, postType, price, condition, cardImageUrl, contactEmail, contactPhone } = req.body;
    const { uid, name, email: userEmail, phone_number: userPhone } = req.user; // From authMiddleware
    const displayName = name || userEmail || 'User';

    if (!cardName || !postType) {
        return res.status(400).json({ msg: 'Card name and post type are required.' });
    }
    
    // Do not fetch price synchronously; background job will enrich
    let finalPrice = (price === undefined || price === null || price === '') ? null : Number(price);
    let isApiPrice = false;

    try {
        // Do not fetch image synchronously; background job will enrich
        let finalImageUrl = cardImageUrl || undefined;

        const email = contactEmail || userEmail || null;
        const phoneNumber = contactPhone || userPhone || null;

        const newPost = new Post({
            user: {
                uid,
                displayName,
                contact: {
                    email,
                    phoneNumber
                }
            },
            cardName,
            postType,
            price: finalPrice,
            condition,
            cardImageUrl: finalImageUrl,
            isApiPrice,
            enrichment: {
                priceStatus: (finalPrice === null ? 'pending' : 'idle'),
                imageStatus: (!finalImageUrl ? 'pending' : 'idle'),
                lastError: null
            }
        });

        const post = await newPost.save();
        // Enqueue background enrichment
        enqueue({ postId: post._id.toString(), cardName });
        res.status(201).json(post);

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// --- Controller for GET /api/posts/my-posts ---
exports.getMyPosts = async (req, res) => {
    try {
        const { uid } = req.user;
        const posts = await Post.find({ 'user.uid': uid }).sort({ createdAt: -1 });
        res.json(posts);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// --- Controller for PUT /api/posts/:id ---
exports.updatePost = async (req, res) => {
    try {
        const { id } = req.params;
        const { uid } = req.user;
        const allowedFields = ['price', 'condition', 'cardImageUrl', 'cardName', 'postType', 'isActive'];
        
        const post = await Post.findById(id);
        if (!post) return res.status(404).json({ msg: 'Post not found' });
        if (post.user?.uid !== uid) return res.status(403).json({ msg: 'Not authorized' });

        for (const key of allowedFields) {
            if (req.body[key] !== undefined) {
                post[key] = req.body[key];
            }
        }
        // If price is manually updated, it's no longer an API price.
        if (req.body.price !== undefined) {
            post.isApiPrice = false;
        }

        const saved = await post.save();
        return res.json(saved);
    } catch (err) {
        console.error(err.message);
        return res.status(500).send('Server Error');
    }
};

// --- Controller for DELETE /api/posts/:id ---
exports.deletePost = async (req, res) => {
    try {
        const { id } = req.params;
        const { uid } = req.user;
        const post = await Post.findById(id);
        if (!post) return res.status(404).json({ msg: 'Post not found' });
        if (post.user?.uid !== uid) return res.status(403).json({ msg: 'Not authorized' });

        await Post.findByIdAndDelete(id);
        return res.json({ msg: 'Post deleted' });
    } catch (err) {
        console.error(err.message);
        return res.status(500).send('Server Error');
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

// --- Controller for POST /api/posts/batch-list ---
// Accepts a list of card names and creates posts. If priceMode === 'market',
// fetch a price per card; if 'fixed', use provided fixedPrice; if 'none', leave empty.
exports.createPostsFromList = async (req, res) => {
    let browser = null;
    try {
        const { uid, name, email: userEmail, phone_number: userPhone } = req.user;
        const displayName = name || userEmail || 'User';
        const { cardNames, priceMode = 'market', fixedPrice, postType = 'sell', condition = 'Near Mint' } = req.body;

        if (!Array.isArray(cardNames) || cardNames.length === 0) {
            return res.status(400).json({ msg: 'cardNames must be a non-empty array.' });
        }

        const cardsToProcess = cardNames.map(s => String(s).trim()).filter(Boolean);
        let pricesMap = new Map();

        const created = [];
        for (const cardName of cardsToProcess) {
            let finalPrice;
            let isApiPrice = false;

            if (priceMode === 'fixed' && fixedPrice !== undefined) {
                finalPrice = Number(fixedPrice);
            } else if (priceMode === 'market') {
                // Defer to background enrichment
                finalPrice = null;
                isApiPrice = false;
            } else {
                finalPrice = null;
            }

            const newPost = new Post({
                user: { uid, displayName, contact: { email: userEmail, phoneNumber: userPhone || null } },
                cardName,
                postType,
                price: finalPrice,
                condition,
                isApiPrice,
                cardImageUrl: undefined,
                enrichment: {
                    priceStatus: (finalPrice === null ? 'pending' : 'idle'),
                    imageStatus: 'pending',
                    lastError: null
                }
            });
            const saved = await newPost.save();
            enqueue({ postId: saved._id.toString(), cardName });
            created.push(saved);
        }

        res.status(201).json({ count: created.length, items: created });
    } catch (err) {
        console.error("Error in createPostsFromList:", err.message);
        res.status(500).send('Server Error');
    } finally {
        // no-op
    }
};


// --- Web Scraper for Card Image ---
exports.getCardImageFromWiki = async (req, res) => {
    const { cardName } = req.body;
    if (!cardName) {
        return res.status(400).json({ message: 'Card name is required.' });
    }

    try {
        const imageUrl = await getCardImageFromYugipedia(cardName);
        if (imageUrl) {
            res.status(200).json({ imageUrl });
        } else {
            res.status(404).json({ message: 'Image not found for the specified card.' });
        }
    } catch (error) {
        // The helper function already logs the detailed error.
        res.status(500).json({ message: 'An error occurred while fetching the card image.' });
    }
};

// --- NEW FUNCTION: Web Scraper for Card Price ---
exports.getCardPriceFromTCG = async (req, res) => {
    const { cardName } = req.body;
    if (!cardName) {
        return res.status(400).json({ message: 'Card name is required.' });
    }
    
    try {
        const result = await getMarketPrice(cardName); // Calls in single mode
        if (result && result.price !== null) {
            res.status(200).json({ price: result.price });
        } else {
            res.status(404).json({ message: 'Price not found for the specified card.' });
        }
    } catch (error) {
        res.status(500).json({ message: 'An error occurred while fetching the card price.' });
    }
};

