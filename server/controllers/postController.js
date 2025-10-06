const Post = require('../models/Post');
const axios = require('axios');
const formidable = require('formidable');
const cheerio = require('cheerio');

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

// --- Helper to fetch card image from Yugipedia ---
const getCardImageFromYugipedia = async (cardName) => {
    try {
        const formattedCardName = encodeURIComponent(String(cardName).trim().replace(/ /g, '_'));
        const wikiUrl = `https://yugipedia.com/wiki/${formattedCardName}`;
        
        const requestConfig = {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer': 'https://yugipedia.com/'
            },
            timeout: 10000
        };

        let html;
        try {
            const res = await axios.get(wikiUrl, requestConfig);
            html = res.data;
        } catch (err) {
            // Retry with index.php style URL if direct path is blocked
            const altUrl = `https://yugipedia.com/index.php?title=${formattedCardName}`;
            const res2 = await axios.get(altUrl, requestConfig);
            html = res2.data;
        }

        const $ = cheerio.load(html);
        const img = $('td.cardtable-cardimage a img');
        let imageUrl = '';

        // Prefer srcset so we can choose a thumbnail size (e.g., 300px)
        if (img.attr('srcset')) {
            const entries = String(img.attr('srcset')).split(',').map(s => s.trim());
            // Extract URL part before any space descriptor
            const urls = entries.map(e => e.split(' ')[0]);
            // Prefer a thumb with 300px width if available
            const preferred = urls.find(u => /\/thumb\//.test(u) && /\/300px-/.test(u))
                || urls.find(u => /\/thumb\//.test(u))
                || urls[0];
            if (preferred) imageUrl = preferred;
        }

        // Fallback to src/data-src if no suitable srcset URL
        if (!imageUrl) {
            imageUrl = img.attr('src') || img.attr('data-src') || '';
        }

        // Fallback to Open Graph image if still missing
        if (!imageUrl) {
            const og = $('meta[property="og:image"]').attr('content');
            if (og) imageUrl = og;
        }

        if (imageUrl) {
            // Normalize protocol-relative URLs
            if (imageUrl.startsWith('//')) {
                imageUrl = `https:${imageUrl}`;
            }
            // If it's a relative path, prefix domain
            if (imageUrl.startsWith('/')) {
                imageUrl = `https://yugipedia.com${imageUrl}`;
            }
            // Some pages use protocol-relative with double slashes after the host; leave as-is or normalize if needed
            // imageUrl = imageUrl.replace(/^https:\/\/(ms\.yugipedia\.com)\/\//, 'https://$1/');
            return imageUrl;
        }
        return null;
    } catch (error) {
        console.error(`Error scraping Yugipedia for card "${cardName}":`, error.message);
        // Fallback to YGOPRODeck API image when Yugipedia blocks or fails
        try {
            const nameParam = encodeURIComponent(String(cardName).trim());
            const resp = await axios.get(`https://db.ygoprodeck.com/api/v7/cardinfo.php?name=${nameParam}`, { timeout: 10000 });
            const img = resp?.data?.data?.[0]?.card_images?.[0]?.image_url_small
                || resp?.data?.data?.[0]?.card_images?.[0]?.image_url
                || null;
            return img;
        } catch (fallbackErr) {
            console.error('Fallback YGOPRODeck failed:', fallbackErr.message);
            return null;
        }
    }
};

// Export helper for routes that need it
exports.getCardImageFromYugipedia = getCardImageFromYugipedia;


// --- Controller for GET /api/posts ---
exports.getAllPosts = async (req, res) => {
    try {
        const {
            q,              // search by card name (partial, case-insensitive)
            user,           // search by user uid or displayName (partial)
            sort = 'latest', // latest | cheapest | alpha
            sortBy,         // optional: field name to sort by
            sortDir,        // optional: asc | desc
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
            const allowed = new Set(['createdAt','price','cardName','postType','condition','user.displayName']);
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

        // Backfill missing or placeholder images in the background and update the response
        const isPlaceholder = (url) => !url || (typeof url === 'string' && url.includes('placehold.co'));
        const backfillTargets = items.filter((p) => isPlaceholder(p.cardImageUrl));
        if (backfillTargets.length > 0) {
            await Promise.allSettled(backfillTargets.map(async (p) => {
                const fetched = await getCardImageFromYugipedia(p.cardName);
                if (fetched) {
                    try {
                        await Post.updateOne({ _id: p._id }, { $set: { cardImageUrl: fetched } });
                        p.cardImageUrl = fetched; // reflect in current response
                    } catch (e) {
                        console.error('Failed to persist backfilled image for', p._id.toString(), e.message);
                    }
                }
            }));
        }

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
    const { uid, name: displayName } = req.user; // From authMiddleware

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
        let finalImageUrl = cardImageUrl;
        if (!finalImageUrl) {
            finalImageUrl = await getCardImageFromYugipedia(cardName);
        }

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
            cardImageUrl: finalImageUrl,
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

// --- Controller for POST /api/posts/batch-list ---
// Accepts a list of card names and creates posts. If priceMode === 'market',
// fetch a price per card; if 'fixed', use provided fixedPrice; if 'none', leave empty.
exports.createPostsFromList = async (req, res) => {
    try {
        const { uid, name: displayName } = req.user;
        const { cardNames, priceMode = 'market', fixedPrice, postType = 'sell', condition = 'Near Mint' } = req.body;

        if (!Array.isArray(cardNames) || cardNames.length === 0) {
            return res.status(400).json({ msg: 'cardNames must be a non-empty array.' });
        }

        const created = [];
        for (const rawName of cardNames) {
            const cardName = String(rawName).trim();
            if (!cardName) continue;

            let finalPrice = undefined;
            let isApiPrice = false;
            if (priceMode === 'fixed' && fixedPrice !== undefined && fixedPrice !== null && fixedPrice !== '') {
                finalPrice = Number(fixedPrice);
            } else if (priceMode === 'market') {
                finalPrice = await getMarketPrice(cardName);
                isApiPrice = finalPrice !== null;
            }

            let imageUrl = await getCardImageFromYugipedia(cardName);

            const newPost = new Post({
                user: { uid, displayName },
                cardName,
                postType,
                price: finalPrice === undefined ? undefined : Number(finalPrice),
                condition,
                isApiPrice: Boolean(isApiPrice),
                cardImageUrl: imageUrl || undefined
            });
            const saved = await newPost.save();
            created.push(saved);
        }

        res.status(201).json({ count: created.length, items: created });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};
// --- NEW FUNCTION: Web Scraper for Card Image ---
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

