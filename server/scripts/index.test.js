const request = require('supertest');
const { app, server } = require('../index');
const { postsService } = require('../services/firestoreService');

// Mock the firebase-admin library
jest.mock('firebase-admin', () => {
    const firestore = () => ({
        collection: () => ({
            doc: () => ({
                get: () => Promise.resolve({ exists: true, data: () => ({}) }),
                set: () => Promise.resolve(),
            }),
            add: () => Promise.resolve(),
        }),
    });

    firestore.FieldValue = {
        serverTimestamp: () => new Date(),
    };

    return {
        initializeApp: jest.fn(),
        firestore,
    };
});

// Mock the auth middleware
jest.mock('../middleware/authMiddleware', () => (req, res, next) => {
  req.user = { uid: 'test-user-123', name: 'Test User', email: 'test@example.com' };
  next();
});

// Mock the firestoreService
jest.mock('../services/firestoreService', () => ({
  postsService: {
    getAllPosts: jest.fn(),
    createPost: jest.fn(),
    getPost: jest.fn(),
  },
}));

describe('Posts API Endpoints', () => {

  afterEach(() => {
    jest.clearAllMocks();
  });

  // This will close the server after all tests are done
  afterAll((done) => {
    server.close(done);
  });

  describe('GET /api/', () => {
    it('should return a list of posts', async () => {
      const mockPosts = [
        { id: '1', cardName: 'Blue-Eyes White Dragon', user: { displayName: 'Kaiba' }, isActive: true },
        { id: '2', cardName: 'Dark Magician', user: { displayName: 'Yugi' }, isActive: true },
      ];
      postsService.getAllPosts.mockResolvedValue(mockPosts);

      const response = await request(app).get('/api/');

      expect(response.status).toBe(200);
      expect(response.body.items).toBeInstanceOf(Array);
      expect(response.body.items.length).toBe(2);
    });
  });

  describe('POST /api/', () => {
    it('should create a new post and return it', async () => {
      const newPostPayload = {
        cardName: 'Red-Eyes Black Dragon',
        postType: 'sell',
        price: 10,
        condition: 'Near Mint',
      };
      
      const createdPostId = 'post-id-123';
      const expectedPost = { id: createdPostId, ...newPostPayload, isActive: true };

      postsService.createPost.mockResolvedValue(createdPostId);
      postsService.getPost.mockResolvedValue(expectedPost);

      const response = await request(app)
        .post('/api/')
        .send(newPostPayload);
      
      expect(response.status).toBe(201);
      expect(response.body).toEqual(expectedPost);
      expect(postsService.createPost).toHaveBeenCalledWith(expect.objectContaining({
        cardName: 'Red-Eyes Black Dragon'
      }));
    });

    it('should return 400 if cardName is missing', async () => {
      const newPostPayload = {
        postType: 'sell',
        price: 10,
      };

      const response = await request(app)
        .post('/api/')
        .send(newPostPayload);

      expect(response.status).toBe(400);
      expect(response.body.msg).toBe('Card name and post type are required.');
    });
  });
});