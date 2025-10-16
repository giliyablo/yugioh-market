const { getMarketPrice, getCardImageFromYugipedia } = require('./cardData');

const processJob = async (db, jobData) => {
    const { postId, cardName } = jobData;
    if (!postId || !cardName) {
        throw new Error('Job data is missing postId or cardName.');
    }

    const postRef = db.collection('posts').doc(postId);
    const postDoc = await postRef.get();

    if (!postDoc.exists) {
        throw new Error(`Post with ID ${postId} does not exist.`);
    }

    const postData = postDoc.data();
    const updatePayload = {};

    let priceFetchAttempted = false;
    let imageFetchAttempted = false;

    // 1. Fetch price only if it's missing, null, or 0.
    if (postData.price == null || postData.price === 0) {
        priceFetchAttempted = true;
        console.log(`Price is missing for "${cardName}". Fetching from TCGplayer...`);
        try {
            const priceResult = await getMarketPrice(cardName);
            if (priceResult && priceResult.price !== null) {
                updatePayload.price = priceResult.price;
                updatePayload.isApiPrice = true;
            }
        } catch (priceError) {
            console.error(`Fetching price for "${cardName}" failed. The job will be marked as failed.`);
            // Re-throw the error to be caught by the job listener, which will mark the job as 'failed'.
            throw priceError;
        }
    }

    // 2. Fetch image only if it's missing or a placeholder.
    if (!postData.cardImageUrl || postData.cardImageUrl.includes('placehold.co')) {
        imageFetchAttempted = true;
        console.log(`Image is missing for "${cardName}". Fetching image...`);
        const imageUrl = await getCardImageFromYugipedia(cardName);
        if (imageUrl) {
            updatePayload.cardImageUrl = imageUrl;
        }
    }

    // Set the final enrichment status based on whether a fetch was attempted and successful.
    if (priceFetchAttempted) {
        updatePayload['enrichment.priceStatus'] = updatePayload.price ? 'done' : 'failed';
    }
    if (imageFetchAttempted) {
        updatePayload['enrichment.imageStatus'] = updatePayload.cardImageUrl ? 'done' : 'failed';
    }


    if (Object.keys(updatePayload).length > 0) {
        console.log(`Updating post ${postId} with new data...`);
        await postRef.update(updatePayload);
    } else {
        console.log(`No enrichment needed for post ${postId}.`);
    }
};

module.exports = { processJob };
