const axios = require('axios');
const cheerio = require('cheerio');

const getMarketPrice = async (cardName) => {
    try {
        const response = await axios.post(
            'https://mp-search-api.tcgplayer.com/v1/search/request?q=' + encodeURIComponent(cardName) + '&isList=false',
            {},
            {
                headers: {
                    'Content-Type': 'application/json',
                }
            }
        );

        const marketPrice = response.data?.results[0]?.results[0]?.marketPrice;

        if (marketPrice) {
            return { cardName, price: marketPrice };
        }
        
        console.warn(`Market price not found for "${cardName}".`);
        return { cardName, price: null };

    } catch (error) {
        console.error(`Error in getMarketPrice for "${cardName}":`, error.message);
        throw error;
    }
};

const getCardImageFromYugipedia = async (cardName) => {
    try {
        const formattedCardName = encodeURIComponent(String(cardName).trim().replace(/ /g, '_'));
        const wikiUrl = `https://yugipedia.com/wiki/${formattedCardName}`;
        const { data: html } = await axios.get(wikiUrl, { timeout: 10000 });
        const $ = cheerio.load(html);
        let imageUrl = ($('td.cardtable-cardimage a img').attr('src') || '').trim();

        if (imageUrl && !imageUrl.startsWith('http')) {
            imageUrl = `https://yugipedia.com${imageUrl}`;
        }
        // If the scraper finds an image, return it. Otherwise, it will proceed to the catch block.
        if (imageUrl) {
            return imageUrl;
        }
        throw new Error('Image not found on Yugipedia page.');

    } catch (error) {
        console.warn(`Could not scrape Yugipedia for "${cardName}", attempting fallback...`);
        // Fallback to YGOPRODeck API
        try {
            const nameParam = encodeURIComponent(String(cardName).trim());
            const { data } = await axios.get(`https://db.ygoprodeck.com/api/v7/cardinfo.php?name=${nameParam}`, { timeout: 10000 });
            
            const cardImages = data?.data?.[0]?.card_images;
            if (cardImages && cardImages.length > 0) {
                // Prioritize the smaller image URL for better performance in a list/grid view.
                return cardImages[0].image_url_small || cardImages[0].image_url;
            }
            return null;
        } catch (fallbackErr) {
            console.error('Fallback to YGOPRODeck API failed:', fallbackErr.message);
            return null;
        }
    }
};

module.exports = { getMarketPrice, getCardImageFromYugipedia };

