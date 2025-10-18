const { getMarketPrice, getCardImageFromYugipedia } = require('./cardData');
const axios = require('axios');

jest.mock('axios');

describe('getMarketPrice', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch the market price from TCGPlayer', async () => {
    const cardName = 'Blue-Eyes White Dragon';
    const mockResponse = {
      data: {
        results: [
          {
            results: [
              {
                marketPrice: 12.34,
              },
            ],
          },
        ],
      },
    };
    axios.post.mockResolvedValue(mockResponse);

    const result = await getMarketPrice(cardName);

    expect(result.price).toBe(12.34);
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining(cardName.replace(/-/g, ' ')),
      expect.any(Object),
      expect.any(Object)
    );
  });
});

describe('getCardImageFromYugipedia', () => {
    afterEach(() => {
      jest.clearAllMocks();
    });
  
    it('should fetch the image URL for "Dark Magician"', async () => {
      const cardName = 'Dark Magician';
      const mockApiResponse = {
        data: {
          data: [
            {
              card_images: [
                {
                  image_url: 'https://example.com/dark_magician.jpg',
                },
              ],
            },
          ],
        },
      };
  
      axios.get.mockResolvedValue(mockApiResponse);
  
      const imageUrl = await getCardImageFromYugipedia(cardName);
  
      expect(imageUrl).toBe('https://example.com/dark_magician.jpg');
      expect(axios.get).toHaveBeenCalledWith(expect.stringContaining(encodeURIComponent(cardName)), expect.any(Object));
    });
  
    it('should return null if no image is found', async () => {
      const cardName = 'Non-Existent Card';
      const mockApiResponse = {
        data: {
          data: [],
        },
      };
      const mockJustTcgResponse = {
        data: {
          cards: []
        }
      };
  
      axios.get
        .mockResolvedValueOnce(mockApiResponse)
        .mockResolvedValueOnce(mockJustTcgResponse);
  
      const imageUrl = await getCardImageFromYugipedia(cardName);
  
      expect(imageUrl).toBeNull();
    });
  });