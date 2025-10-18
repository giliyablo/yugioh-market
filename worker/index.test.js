const { processJob } = require('./jobs');
const cardData = require('./cardData');

// Mock the cardData module
jest.mock('./cardData', () => ({
  getMarketPrice: jest.fn(),
  getCardImageFromYugipedia: jest.fn(),
}));

// Mock Firestore
const mockUpdate = jest.fn();
const mockGet = jest.fn();
const mockDoc = jest.fn(() => ({
  get: mockGet,
  update: mockUpdate,
}));
const mockDb = {
  collection: jest.fn(() => ({
    doc: mockDoc,
  })),
};

describe('Worker Job Processing', () => {

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should fetch price and image and update the post', async () => {
    // Arrange
    const jobData = { postId: 'post1', cardName: 'Blue-Eyes White Dragon' };
    const mockPost = {
      exists: true,
      data: () => ({
        cardName: 'Blue-Eyes White Dragon',
        price: null,
        cardImageUrl: 'https://placehold.co/243x353?text=No+Image',
        enrichment: {}
      }),
    };

    mockGet.mockResolvedValue(mockPost);
    cardData.getMarketPrice.mockResolvedValue({ price: 12.34 });
    cardData.getCardImageFromYugipedia.mockResolvedValue('http://example.com/image.png');

    // Act
    await processJob(mockDb, jobData);

    // Assert
    expect(cardData.getMarketPrice).toHaveBeenCalledWith('Blue-Eyes White Dragon');
    expect(cardData.getCardImageFromYugipedia).toHaveBeenCalledWith('Blue-Eyes White Dragon');

    expect(mockUpdate).toHaveBeenCalledTimes(1);

    // Check the final update payload
    const finalUpdateCall = mockUpdate.mock.calls[0][0];
    expect(finalUpdateCall.price).toBe(12.34);
    expect(finalUpdateCall.cardImageUrl).toBe('http://example.com/image.png');
    expect(finalUpdateCall.isApiPrice).toBe(true);
    expect(finalUpdateCall['enrichment.priceStatus']).toBe('done');
    expect(finalUpdateCall['enrichment.imageStatus']).toBe('done');
  });

  it('should only fetch the image if price already exists', async () => {
    // Arrange
    const jobData = { postId: 'post2', cardName: 'Dark Magician' };
    const mockPost = {
      exists: true,
      data: () => ({
        cardName: 'Dark Magician',
        price: 15.00, // Price already exists
        cardImageUrl: 'https://placehold.co/243x353?text=No+Image',
        enrichment: {}
      }),
    };
    mockGet.mockResolvedValue(mockPost);
    cardData.getCardImageFromYugipedia.mockResolvedValue('http://example.com/dark_magician.png');

    // Act
    await processJob(mockDb, jobData);

    // Assert
    expect(cardData.getMarketPrice).not.toHaveBeenCalled();
    expect(cardData.getCardImageFromYugipedia).toHaveBeenCalledWith('Dark Magician');
    const finalUpdateCall = mockUpdate.mock.calls[0][0];
    expect(finalUpdateCall.cardImageUrl).toBe('http://example.com/dark_magician.png');
    expect(finalUpdateCall['enrichment.imageStatus']).toBe('done');
    expect(finalUpdateCall['enrichment.priceStatus']).toBe(undefined); // Should not be touched
  });

  it('should only fetch the price if image already exists', async () => {
    // Arrange
    const jobData = { postId: 'post3', cardName: 'Red-Eyes Black Dragon' };
    const mockPost = {
      exists: true,
      data: () => ({
        cardName: 'Red-Eyes Black Dragon',
        price: null,
        cardImageUrl: 'http://example.com/red_eyes.png', // Image already exists
        enrichment: {}
      }),
    };

    mockGet.mockResolvedValue(mockPost);
    cardData.getMarketPrice.mockResolvedValue({ price: 10.00 });

    // Act
    await processJob(mockDb, jobData);

    // Assert
    expect(cardData.getMarketPrice).toHaveBeenCalledWith('Red-Eyes Black Dragon');
    expect(cardData.getCardImageFromYugipedia).not.toHaveBeenCalled();

    const finalUpdateCall = mockUpdate.mock.calls[0][0];
    expect(finalUpdateCall.price).toBe(10.00);
    expect(finalUpdateCall['enrichment.priceStatus']).toBe('done');
    expect(finalUpdateCall['enrichment.imageStatus']).toBe(undefined);
  });

  it('should not do anything if both price and image exist', async () => {
    // Arrange
    const jobData = { postId: 'post4', cardName: 'Pot of Greed' };
    const mockPost = {
      exists: true,
      data: () => ({
        cardName: 'Pot of Greed',
        price: 1.00,
        cardImageUrl: 'http://example.com/pot_of_greed.png',
        enrichment: {}
      }),
    };

    mockGet.mockResolvedValue(mockPost);

    // Act
    await processJob(mockDb, jobData);

    // Assert
    expect(cardData.getMarketPrice).not.toHaveBeenCalled();
    expect(cardData.getCardImageFromYugipedia).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('should throw an error if fetching the price fails', async () => {
    // Arrange
    const jobData = { postId: 'post5', cardName: 'Problem Card' };
    const mockPost = {
      exists: true,
      data: () => ({
        cardName: 'Problem Card',
        price: null,
        cardImageUrl: 'https://placehold.co/243x353?text=No+Image',
        enrichment: {}
      }),
    };

    mockGet.mockResolvedValue(mockPost);
    cardData.getMarketPrice.mockRejectedValue(new Error('API is down'));

    // Act & Assert
    await expect(processJob(mockDb, jobData)).rejects.toThrow('API is down');
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('should update the enrichment status to "failed" if fetching the image fails', async () => {
    // Arrange
    const jobData = { postId: 'post6', cardName: 'Another Problem Card' };
    const mockPost = {
        exists: true,
        data: () => ({
            cardName: 'Another Problem Card',
            price: 10.00,
            cardImageUrl: 'https://placehold.co/243x353?text=No+Image',
            enrichment: {}
        }),
    };

    mockGet.mockResolvedValue(mockPost);
    cardData.getCardImageFromYugipedia.mockResolvedValue(null);

    // Act
    await processJob(mockDb, jobData);

    // Assert
    expect(cardData.getCardImageFromYugipedia).toHaveBeenCalledWith('Another Problem Card');
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    const finalUpdateCall = mockUpdate.mock.calls[0][0];
    expect(finalUpdateCall.cardImageUrl).toBe(undefined);
    expect(finalUpdateCall['enrichment.imageStatus']).toBe('failed');
  });
});