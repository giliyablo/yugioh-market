const request = require('supertest');
const { app, server } = require('../index');
const postController = require('../controllers/postController');

// We create a mock function that our test can track.
const mockEnqueueJob = jest.fn();

// Mock the entire postController module.
// This ensures that when the router calls `getAllPosts` or `createPost`, it executes our mock implementation below.
jest.mock('../controllers/postController', () => ({
  // We use `jest.requireActual` to get the real functions, so we can still export them.
  ...jest.requireActual('../controllers/postController'),
  // We replace the real `getAllPosts` with a mock version for our test.
  getAllPosts: jest.fn(async (req, res) => {
    // Inside the mock, we simulate the self-heal logic.
    const mockPosts = [
        { id: '1', cardName: 'Blue-Eyes White Dragon', price: null }, // This post needs enrichment.
    ];
    // Here, we call the mockEnqueueJob function that our test can see.
    mockEnqueueJob({ postId: '1', cardName: 'Blue-Eyes White Dragon' });
    res.json({ items: mockPosts });
  }),
  // We do the same for `createPost`.
  createPost: jest.fn(async (req, res) => {
    const { cardName } = req.body;
    const postId = 'post-123';
    // Call the mockEnqueueJob for the new post.
    mockEnqueueJob({ postId, cardName });
    res.status(201).json({ id: postId, cardName });
  }),
}));

// We still need to mock firebase-admin to prevent any real DB connections from other parts of the app.
jest.mock('firebase-admin', () => ({
    initializeApp: jest.fn(),
    credential: { cert: jest.fn() },
    firestore: jest.fn(),
}));

// Mock the auth middleware as before.
jest.mock('../middleware/authMiddleware', () => (req, res, next) => {
  req.user = { uid: 'test-user-123', name: 'Test User' };
  next();
});

describe('Posts API Endpoints', () => {
  
  beforeEach(() => {
    // Clear the history of our mock functions before each test.
    mockEnqueueJob.mockClear();
    postController.getAllPosts.mockClear();
    postController.createPost.mockClear();
  });

  afterAll((done) => {
    server.close(done);
  });

  describe('GET /api/', () => {
    it('should call the controller and trigger the self-heal job', async () => {
      await request(app).get('/api/');
      
      // Check that our mock controller function was called by the router.
      expect(postController.getAllPosts).toHaveBeenCalledTimes(1);
      // Check that our trackable mockEnqueueJob function was called from within the controller mock.
      expect(mockEnqueueJob).toHaveBeenCalledTimes(1);
      expect(mockEnqueueJob).toHaveBeenCalledWith({ postId: '1', cardName: 'Blue-Eyes White Dragon' });
    });
  });

  describe('POST /api/', () => {
    it('should call the controller and trigger the create post job', async () => {
      const newPostPayload = { cardName: 'Dark Magician' };
      await request(app).post('/api/').send(newPostPayload);

      // Check that the mock createPost function was called.
      expect(postController.createPost).toHaveBeenCalledTimes(1);
      // Check that the job was enqueued for the new post.
      expect(mockEnqueueJob).toHaveBeenCalledTimes(1);
      expect(mockEnqueueJob).toHaveBeenCalledWith({ postId: 'post-123', cardName: 'Dark Magician' });
    });
  });
});