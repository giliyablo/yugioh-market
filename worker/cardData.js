const axios = require('axios');
const cheerio = require('cheerio');

const getMarketPrice = async (cardName) => {
    try {
        // This more detailed payload enables the API's fuzzy search and "did you mean" features.
        const payload = {
            "algorithm": "sales_synonym_v2",
            "from": 0,
            "size": 1,
            "filters": {
                "term": {
                    // Ensures the search is specific to the Yu-Gi-Oh! product line.
                    "productLineName": ["yugioh"]
                }
            },
            "q": cardName, // The card name is included in the body for the advanced search.
            "context": {
                "shippingCountry": "US"
            },
            "settings": {
                "useFuzzySearch": true,
                "didYouMean": true
            }
        };

        const response = await axios.post(
            'https://mp-search-api.tcgplayer.com/v1/search/request',
            payload,
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
        if (error.response) {
            console.error(`API error for "${cardName}": ${error.response.status}`);
        } else {
            console.error(`Error in getMarketPrice for "${cardName}":`, error.message);
        }
        throw error; // Propagate the error to mark the job as failed.
    }
};

const getCardImageFromYugipedia = async (cardName) => {
    try {
        const nameParam = encodeURIComponent(String(cardName).trim());
        const { data } = await axios.get(`https://db.ygoprodeck.com/api/v7/cardinfo.php?name=${nameParam}`, { timeout: 10000 });
        
        const cardImages = data?.data?.[0]?.card_images;
        if (cardImages && cardImages.length > 0) {
            return cardImages[0].image_url_small || cardImages[0].image_url;
        }
        return null;
    } catch (fallbackErr) {
        console.error('Fallback to YGOPRODeck API failed:', fallbackErr.message);
        return null;
    }
};

module.exports = { getMarketPrice, getCardImageFromYugipedia };
