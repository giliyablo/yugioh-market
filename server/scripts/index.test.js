const request = require('supertest');
const { app, server } = require('../index');
const { postsService } = require('../services/firestoreService');
const postController = require('../controllers/postController');

// Mock firebase-admin to prevent real database calls
jest.mock('firebase-admin', () => {
    const firestoreMock = () => ({});
    firestoreMock.FieldValue = {
        serverTimestamp: () => 'MOCK_TIMESTAMP',
    };
    return {
        initializeApp: jest.fn(),
        credential: { cert: jest.fn() },
        firestore: firestoreMock,
    };
});

// Mock auth middleware
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

// Spy on the now-exported enqueue and replace its implementation
const enqueueSpy = jest.spyOn(postController, 'enqueue').mockImplementation(() => Promise.resolve());

describe('Posts API Endpoints', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll((done) => {
    server.close(done);
  });

  describe('GET /api/', () => {
    it('should return a list of posts and trigger self-heal for items needing enrichment', async () => {
      const mockPosts = [
        { id: '1', cardName: 'Blue-Eyes White Dragon', price: null }, // Needs enrichment
        { id: '2', cardName: 'Dark Magician', price: 15.50 }, // Does not need enrichment
      ];
      postsService.getAllPosts.mockResolvedValue(mockPosts);

      await request(app).get('/api/');

      // Expect the self-heal to have been called once for the post with a null price
      expect(enqueueSpy).toHaveBeenCalledTimes(1);
      expect(enqueueSpy).toHaveBeenCalledWith({ postId: '1', cardName: 'Blue-Eyes White Dragon' });
    });
  });

  describe('POST /api/', () => {
    it('should create a new post and enqueue a job', async () => {
      const newPostPayload = { cardName: 'Red-Eyes Black Dragon', postType: 'sell', price: 10 };
      const createdPostId = 'post-123';
      const expectedPost = { id: createdPostId, ...newPostPayload };

      postsService.createPost.mockResolvedValue(createdPostId);
      postsService.getPost.mockResolvedValue(expectedPost);

      await request(app).post('/api/').send(newPostPayload);

      // Expect enqueue to be called for the new post
      expect(enqueueSpy).toHaveBeenCalledTimes(1);
      expect(enqueueSpy).toHaveBeenCalledWith({ postId: createdPostId, cardName: 'Red-Eyes Black Dragon' });
    });
  });
});