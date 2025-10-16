const { getMarketPrice } = require('./cardData');

describe('getMarketPrice for specific cards', () => {
  const testCards = [
    "Clear Wing Synchro Dragon",
    "Hi-speedroid hagoita", // Intentionally lowercase to test fuzzy matching
    "Hi-Speedroid Cork Shooter",
    "Altergeist Adminia"
  ];

  // This will create a separate test for each card in the array
  test.each(testCards)('should fetch a valid market price for "%s"', async (cardName) => {
    console.log(`Testing price fetching for: ${cardName}`);
    const result = await getMarketPrice(cardName);

    console.log(`API Result for "${cardName}":`, result);

    expect(result).toBeDefined();
    expect(result.price).not.toBeNull();
    expect(typeof result.price).toBe('number');
    expect(result.price).toBeGreaterThan(0);
  }, 30000); // Extended timeout for multiple API calls
});

