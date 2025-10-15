const { getMarketPrice, getCardImageFromYugipedia } = require('./cardData');

const processJob = async (db, jobData) => {
    const { postId, cardName } = jobData;
    if (!postId || !cardName) {
        throw new Error('Job data is missing postId or cardName.');
    }

    const postRef = db.collection('posts').doc(postId);
    const [imageUrl, priceResult] = await Promise.all([
        getCardImageFromYugipedia(cardName),
        getMarketPrice(cardName)
    ]);

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
        // If no data was fetched, throw an error to mark the job as failed
        throw new Error('Failed to fetch both price or image for the card.');
    }
};

module.exports = { processJob };
