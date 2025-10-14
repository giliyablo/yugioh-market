const puppeteer = require('puppeteer');
const { getMarketPrice, getCardImageFromYugipedia } = require('./cardData');
const admin = require('firebase-admin');

// Get Firestore instance
const db = admin.firestore();

/**
 * Processes a single job from the Firestore queue.
 * Fetches price and image for a card and updates the corresponding post.
 * @param {object} jobData The data from the Firestore job document.
 */
const processJob = async (jobData) => {
    const { postId, cardName } = jobData;

    if (!postId || !cardName) {
        throw new Error('Job data is missing postId or cardName.');
    }

    const postRef = db.collection('posts').doc(postId);
    const postDoc = await postRef.get();

    if (!postDoc.exists) {
        console.warn(`Post with ID ${postId} not found. Skipping job.`);
        return;
    }

    const post = postDoc.data();
    const updatePayload = {};
    const enrichmentUpdate = { ...post.enrichment };

    const tasks = [];

    // --- Price Fetching Task ---
    const needsPrice = post.price === undefined || post.price === null || post.price === '';
    if (needsPrice) {
        enrichmentUpdate.priceStatus = 'pending';
        tasks.push(
            getMarketPrice(cardName)
                .then(result => {
                    if (result && result.price !== null) {
                        updatePayload.price = result.price;
                        updatePayload.isApiPrice = true;
                        enrichmentUpdate.priceStatus = 'done';
                    } else {
                        enrichmentUpdate.priceStatus = 'error';
                        enrichmentUpdate.lastError = 'Price not found';
                    }
                })
                .catch(e => {
                    enrichmentUpdate.priceStatus = 'error';
                    enrichmentUpdate.lastError = e.message;
                })
        );
    }

    // --- Image Fetching Task ---
    const isPlaceholder = (url) => !url || (typeof url === 'string' && url.includes('placehold.co'));
    if (isPlaceholder(post.cardImageUrl)) {
        enrichmentUpdate.imageStatus = 'pending';
        tasks.push(
            getCardImageFromYugipedia(cardName)
                .then(img => {
                    if (img) {
                        updatePayload.cardImageUrl = img;
                        enrichmentUpdate.imageStatus = 'done';
                    } else {
                        enrichmentUpdate.imageStatus = 'error';
                        enrichmentUpdate.lastError = (enrichmentUpdate.lastError || '') + ' Image not found.';
                    }
                })
                .catch(e => {
                    enrichmentUpdate.imageStatus = 'error';
                    enrichmentUpdate.lastError = (enrichmentUpdate.lastError || '') + ` ${e.message}`;
                })
        );
    }

    if (tasks.length === 0) {
        console.log(`No enrichment needed for post ${postId}.`);
        return;
    }

    // Initially update the status to 'pending'
    await postRef.update({ enrichment: enrichmentUpdate });

    // Wait for all scraping tasks to complete
    await Promise.allSettled(tasks);

    // Final update with the fetched data
    updatePayload.enrichment = enrichmentUpdate;
    await postRef.update(updatePayload);

    console.log(`Finished processing job for post ${postId}`);
};

module.exports = { processJob };
