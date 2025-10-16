const { getMarketPrice, getCardImageFromYugipedia } = require('./cardData');

// Test for fetching market price
describe('getMarketPrice', () => {
  it('should fetch the market price for "Scapeghost"', async () => {
    console.log('Testing price fetching for card: Scapeghost');
    const result = await getMarketPrice('Scapeghost');

    console.log('Price API Result:', result);

    expect(result).toBeDefined();
    expect(result.cardName).toBe('Scapeghost');
    expect(result.price).not.toBeNull();
    expect(typeof result.price).toBe('number');
    expect(result.price).toBeGreaterThan(0);
  }, 20000);
});

// New test for fetching card image
describe('getCardImageFromYugipedia', () => {
  it('should fetch the image URL for "Scapeghost"', async () => {
    console.log('Testing image fetching for card: Scapeghost');
    const imageUrl = await getCardImageFromYugipedia('Scapeghost');

    console.log('Image URL Result:', imageUrl);

    expect(imageUrl).not.toBeNull();
    expect(typeof imageUrl).toBe('string');
    // This regex checks for a valid image URL from either the primary or fallback source.
    expect(imageUrl).toMatch(/^https:\/\/.+\.(png|jpg|jpeg)(\?.*)?$/);
  }, 20000); // Increased timeout for network requests
});

