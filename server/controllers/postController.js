const formidable = require('formidable');
const { postsService } = require('../services/firestoreService');
const admin = require('firebase-admin'); // Ensure firebase-admin is imported

// This function now creates a job document in Firestore.
const enqueue = async (jobData) => {
    try {
        const job = {
            ...jobData,
            status: 'pending', // Initial status
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        };
        await admin.firestore().collection('jobs').add(job);
        console.log('Successfully enqueued job for card:', jobData.cardName);
    } catch (error) {
        console.error('Error enqueuing job to Firestore:', error);
    }
};


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

        // Get all posts from Firestore
        let allPosts = await postsService.getAllPosts();
        
        // Filter by isActive
        allPosts = allPosts.filter(post => post.isActive !== false);
        
        // Apply search filters
        if (q && typeof q === 'string') {
            const searchTerm = q.toLowerCase();
            allPosts = allPosts.filter(post => 
                post.cardName && post.cardName.toLowerCase().includes(searchTerm)
            );
        }
        
        if (user && typeof user === 'string') {
            const userTerm = user.toLowerCase();
            allPosts = allPosts.filter(post => 
                (post.user && post.user.uid === user) ||
                (post.user && post.user.displayName && post.user.displayName.toLowerCase().includes(userTerm))
            );
        }

        // Apply sorting
        if (sortBy) {
            const dir = (String(sortDir).toLowerCase() === 'asc') ? 1 : -1;
            const allowed = new Set(['createdAt','price','cardName','postType','condition']);
            if (allowed.has(sortBy)) {
                allPosts.sort((a, b) => {
                    const aVal = a[sortBy];
                    const bVal = b[sortBy];
                    if (aVal < bVal) return -1 * dir;
                    if (aVal > bVal) return 1 * dir;
                    return 0;
                });
            }
        } else {
            if (sort === 'cheapest') {
                allPosts.sort((a, b) => {
                    if (a.price === b.price) return new Date(b.createdAt) - new Date(a.createdAt);
                    return (a.price || 0) - (b.price || 0);
                });
            } else if (sort === 'alpha') {
                allPosts.sort((a, b) => (a.cardName || '').localeCompare(b.cardName || ''));
            } else {
                // Default: latest
                allPosts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            }
        }

        // Apply pagination
        const total = allPosts.length;
        const startIndex = (pageNum - 1) * pageSize;
        const items = allPosts.slice(startIndex, startIndex + pageSize);

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

        const postData = {
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
            condition: condition || 'Near Mint',
            cardImageUrl: finalImageUrl || 'https://placehold.co/243x353?text=No+Image',
            isApiPrice,
            isActive: true,
            enrichment: {
                priceStatus: (finalPrice === null ? 'pending' : 'idle'),
                imageStatus: (!finalImageUrl ? 'pending' : 'idle'),
                lastError: null
            }
        };

        const postId = await postsService.createPost(postData);
        const post = { id: postId, ...postData };
        
        // Enqueue background enrichment by creating a Firestore document
        enqueue({ postId: postId, cardName });
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
        const posts = await postsService.getPostsByUser(uid);
        res.json({ data: posts });
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
        
        const post = await postsService.getPost(id);
        if (!post) return res.status(404).json({ msg: 'Post not found' });
        
        const isAdmin = await postsService.isUserAdmin(uid);
        if (post.user?.uid !== uid && !isAdmin) {
            return res.status(403).json({ msg: 'Not authorized' });
        }

        const updateData = {};
        for (const key of allowedFields) {
            if (req.body[key] !== undefined) {
                updateData[key] = req.body[key];
            }
        }
        // If price is manually updated, it's no longer an API price.
        if (req.body.price !== undefined) {
            updateData.isApiPrice = false;
        }

        await postsService.updatePost(id, updateData);
        const updatedPost = await postsService.getPost(id);
        return res.json(updatedPost);
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
        const post = await postsService.getPost(id);
        if (!post) return res.status(404).json({ msg: 'Post not found' });
        
        const isAdmin = await postsService.isUserAdmin(uid);
        if (post.user?.uid !== uid && !isAdmin) {
            return res.status(403).json({ msg: 'Not authorized' });
        }

        await postsService.deletePost(id);
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

        console.log('Batch file received (implementation pending):', files.batchFile);
        res.status(202).json({ 
            msg: 'Batch upload received and is being processed. This feature is a work in progress.' 
        });
    });
};

// --- Controller for POST /api/posts/batch-list ---
exports.createPostsFromList = async (req, res) => {
    try {
        const { uid, name, email: userEmail, phone_number: userPhone } = req.user;
        const displayName = name || userEmail || 'User';
        const { cardNames, priceMode = 'market', fixedPrice, postType = 'sell', condition = 'Near Mint' } = req.body;

        if (!Array.isArray(cardNames) || cardNames.length === 0) {
            return res.status(400).json({ msg: 'cardNames must be a non-empty array.' });
        }

        const cardsToProcess = cardNames.map(s => String(s).trim()).filter(Boolean);
        const created = [];

        for (const cardName of cardsToProcess) {
            let finalPrice = null;
            let isApiPrice = false;

            if (priceMode === 'fixed' && fixedPrice !== undefined) {
                finalPrice = Number(fixedPrice);
            }

            const postData = {
                user: { uid, displayName, contact: { email: userEmail, phoneNumber: userPhone || null } },
                cardName,
                postType,
                price: finalPrice,
                condition,
                isApiPrice,
                cardImageUrl: 'https://placehold.co/243x353?text=No+Image',
                isActive: true,
                enrichment: {
                    priceStatus: (finalPrice === null ? 'pending' : 'idle'),
                    imageStatus: 'pending',
                    lastError: null
                }
            };

            const postId = await postsService.createPost(postData);
            const saved = { id: postId, ...postData };
            enqueue({ postId: postId, cardName });
            created.push(saved);
        }

        res.status(201).json({ count: created.length, items: created });
    } catch (err) {
        console.error("Error in createPostsFromList:", err.message);
        res.status(500).send('Server Error');
    }
};
