// giliyablo/yugioh-market/yugioh-market-e6759367203882ac287f720598e236db05239e5f/worker/jobs.js
const { getMarketPrice, getCardImageFromYugipedia } = require('./cardData');

const processJob = async (db, jobData) => {
    const { postId, cardName } = jobData;
    if (!postId || !cardName) {
        throw new Error('Job data is missing postId or cardName.');
    }

    const postRef = db.collection('posts').doc(postId);

    // We run promises sequentially now to ensure a price failure stops execution
    let priceResult = null;
    try {
        priceResult = await getMarketPrice(cardName);
    } catch (priceError) {
        console.error(`Scraping price for "${cardName}" failed, job will be marked as failed.`);
        // Re-throw to be caught by the main job listener in index.js
        throw priceError;
    }
    
    // Image fetching can still fail gracefully with a fallback
    const imageUrl = await getCardImageFromYugipedia(cardName);

    const updatePayload = {};
    if (priceResult && priceResult.price !== null) {
        updatePayload.price = priceResult.price;
        updatePayload.isApiPrice = true;
    }
    if (imageUrl) {
        updatePayload.cardImageUrl = imageUrl;
    }

    if (Object.keys(updatePayload).length > 0) {
        await postRef.update(updatePayload);
    } else {
        throw new Error('Could not retrieve any data for the card.');
    }
};

module.exports = { processJob };
