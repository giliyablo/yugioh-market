const formidable = require('formidable');
const { postsService } = require('../services/firestoreService');
const admin = require('firebase-admin'); // Ensure firebase-admin is imported

// This function now creates a job document in Firestore.
const enqueue = async (jobData) => {
    try {
        // A simple check to prevent re-enqueueing jobs that are already being processed.
        const jobsRef = admin.firestore().collection('jobs');
        const snapshot = await jobsRef.where('postId', '==', jobData.postId).where('status', 'in', ['pending', 'running']).get();
        
        if (!snapshot.empty) {
            console.log(`Job for post ${jobData.postId} is already pending or running. Skipping.`);
            return;
        }

        const job = {
            ...jobData,
            status: 'pending', // Initial status
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        };
        await jobsRef.add(job);
        console.log('Successfully enqueued job for card:', jobData.cardName);
    } catch (error) {
        console.error('Error enqueuing job to Firestore:', error);
    }
};

// Helper function to determine if a post needs price/image enrichment
const needsEnrichment = (post) => {
    const priceMissing = post.price === null;
    const imageMissing = !post.cardImageUrl || post.cardImageUrl.includes('placehold.co');
    return priceMissing || imageMissing;
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

        // --- Self-healing mechanism: Enqueue jobs for any posts that need it ---
        // This runs in the background (fire-and-forget) and does not delay the API response.
        allPosts.forEach(post => {
            if (needsEnrichment(post)) {
                console.log(`[Self-Heal] Post ${post.id} for "${post.cardName}" needs enrichment. Enqueueing job.`);
                enqueue({ postId: post.id, cardName: post.cardName });
            }
        });
        
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
    const authenticatedUser = req.user;
    const postPayload = req.body;

    if (postPayload.user && postPayload.user.uid !== authenticatedUser.uid) {
        return res.status(403).json({ msg: 'Payload UID does not match authenticated user.' });
    }

    const { cardName, postType } = postPayload;

    if (!cardName || !postType) {
        return res.status(400).json({ msg: 'Card name and post type are required.' });
    }

    try {
        const finalUserObject = {
            uid: authenticatedUser.uid,
            displayName: postPayload.user?.displayName || authenticatedUser.displayName || 'Anonymous User',
            photoURL: postPayload.user?.photoURL || authenticatedUser.photoURL || null,
            contact: {
                email: postPayload.user?.contact?.email || authenticatedUser.email || null,
                phoneNumber: postPayload.user?.contact?.phoneNumber || authenticatedUser.phoneNumber || null,
            }
        };

        // Treat 0, empty string, or undefined as null to trigger enrichment.
        const finalPrice = (!postPayload.price) ? null : Number(postPayload.price);
        const finalImageUrl = postPayload.cardImageUrl || 'https://placehold.co/243x353?text=No+Image';

        const postData = {
            ...postPayload,
            price: finalPrice,
            cardImageUrl: finalImageUrl,
            user: finalUserObject,
            isActive: true,
            isApiPrice: finalPrice === null, // It's an API price if we need to fetch it
            enrichment: {
                priceStatus: finalPrice === null ? 'pending' : 'idle',
                imageStatus: finalImageUrl.includes('placehold.co') ? 'pending' : 'idle',
                lastError: null
            }
        };
        
        delete postData.createdAt;
        delete postData.updatedAt;

        const postId = await postsService.createPost(postData);
        
        if (needsEnrichment(postData)) {
            enqueue({ postId: postId, cardName: postData.cardName });
        }

        const createdPost = await postsService.getPost(postId);
        res.status(201).json(createdPost);

    } catch (err) {
        console.error('Error in createPost:', err.message);
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
        
        // If price is explicitly updated to be empty/0, set it to null to trigger re-enrichment.
        if (req.body.price !== undefined) {
            if (!req.body.price || Number(req.body.price) === 0) {
                updateData.price = null;
                updateData.isApiPrice = true; // Will be API price after worker runs
                updateData.enrichment = { ...post.enrichment, priceStatus: 'pending' };
            } else {
                updateData.isApiPrice = false; // Manually set price
                updateData.enrichment = { ...post.enrichment, priceStatus: 'idle' };
            }
        }

        // If image URL is removed or set to placeholder, trigger re-enrichment.
        if (req.body.cardImageUrl !== undefined && (!req.body.cardImageUrl || req.body.cardImageUrl.includes('placehold.co'))) {
            updateData.cardImageUrl = 'https://placehold.co/243x353?text=No+Image';
            updateData.enrichment = { ...(updateData.enrichment || post.enrichment), imageStatus: 'pending' };
        }

        await postsService.updatePost(id, updateData);
        
        const updatedPostForCheck = { ...post, ...updateData };
        if (needsEnrichment(updatedPostForCheck)) {
            console.log(`[Post Update] Post ${id} needs enrichment after update. Enqueueing job.`);
            enqueue({ postId: id, cardName: updatedPostForCheck.cardName });
        }

        const finalUpdatedPost = await postsService.getPost(id);
        return res.json(finalUpdatedPost);
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
        const { uid, name, email: userEmail, phone_number: userPhone, photoURL } = req.user;
        const displayName = name || userEmail || 'Anonymous User';
        const { cardNames, priceMode = 'market', fixedPrice, postType = 'sell', condition = 'Near Mint' } = req.body;

        if (!Array.isArray(cardNames) || cardNames.length === 0) {
            return res.status(400).json({ msg: 'cardNames must be a non-empty array.' });
        }

        const cardsToProcess = cardNames.map(s => String(s).trim()).filter(Boolean);
        const createdPosts = [];

        for (const cardName of cardsToProcess) {
            let finalPrice = null;
            let isApiPrice = false;

            if (priceMode === 'fixed' && fixedPrice !== undefined) {
                finalPrice = Number(fixedPrice);
            }

            const postData = {
                user: { 
                    uid, 
                    displayName, 
                    photoURL: photoURL || null,
                    contact: { 
                        email: userEmail || null, 
                        phoneNumber: userPhone || null 
                    } 
                },
                cardName,
                postType,
                price: finalPrice,
                condition,
                isApiPrice,
                cardImageUrl: 'https://placehold.co/243x353?text=No+Image',
                isActive: true,
                enrichment: {
                    priceStatus: (priceMode === 'none' || finalPrice !== null) ? 'idle' : 'pending',
                    imageStatus: 'pending',
                    lastError: null
                }
            };

            const postId = await postsService.createPost(postData);
            enqueue({ postId: postId, cardName });
            const savedPost = await postsService.getPost(postId);
            createdPosts.push(savedPost);
        }

        res.status(201).json({ count: createdPosts.length, items: createdPosts });
    } catch (err) {
        console.error("Error in createPostsFromList:", err.message);
        res.status(500).send('Server Error');
    }
};
// --- Controller for POST /api/posts/admin/batch-whatsapp ---
exports.createPostsFromWhatsapp = async (req, res) => {
    try {
        const postsToCreate = req.body.posts;

        if (!Array.isArray(postsToCreate) || postsToCreate.length === 0) {
            return res.status(400).json({ msg: 'Request body must be an array of posts to create.' });
        }

        const createdPosts = [];

        for (const post of postsToCreate) {
            const { phoneNumber, postType, cardName } = post;
            
            // Create a simple user object for the post.
            // Using a prefix to easily identify WhatsApp-sourced users.
            const user = {
                uid: `whatsapp_${phoneNumber.replace(/\D/g, '')}`,
                displayName: phoneNumber,
                photoURL: null,
                contact: {
                    email: null,
                    phoneNumber: phoneNumber
                }
            };

            const postData = {
                cardName,
                postType,
                condition: 'Near Mint', // Default condition
                price: null, // To be fetched by the worker
                isApiPrice: true,
                cardImageUrl: 'https://placehold.co/243x353?text=No+Image', // To be fetched by the worker
                isActive: true,
                user: user,
                enrichment: {
                    priceStatus: 'pending',
                    imageStatus: 'pending',
                    lastError: null
                }
            };
            
            const postId = await postsService.createPost(postData);
            enqueue({ postId: postId, cardName }); // Enqueue for price/image fetching
            
            const savedPost = await postsService.getPost(postId);
            createdPosts.push(savedPost);
        }

        res.status(201).json({
            message: `Successfully created ${createdPosts.length} posts.`,
            createdPosts
        });

    } catch (err) {
        console.error("Error in createPostsFromWhatsapp:", err.message);
        res.status(500).send('Server Error');
    }
};

exports.enqueue = enqueue;
