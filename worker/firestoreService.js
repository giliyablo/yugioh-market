const admin = require('firebase-admin');

// Get Firestore instance for the correct project
const db = admin.firestore();

// Helper function to convert Firestore timestamps
const convertTimestamps = (data) => {
  if (!data) return data;

  const converted = { ...data };
  Object.keys(converted).forEach(key => {
    if (converted[key] && converted[key].toDate) {
      converted[key] = converted[key].toDate();
    }
  });
  return converted;
};

// Posts service
const postsService = {
  // Create a new post
  createPost: async (postData) => {
    try {
      const docRef = await db.collection('posts').add({
        ...postData,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating post:', error);
      throw error;
    }
  },

  // Get all posts
  getAllPosts: async () => {
    try {
      const snapshot = await db.collection('posts')
        .orderBy('createdAt', 'desc')
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...convertTimestamps(doc.data())
      }));
    } catch (error) {
      console.error('Error getting posts:', error);
      throw error;
    }
  },

  // Get posts by user
  getPostsByUser: async (userId) => {
    try {
      const snapshot = await db.collection('posts')
        .where('user.uid', '==', userId)
        .orderBy('createdAt', 'desc')
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...convertTimestamps(doc.data())
      }));
    } catch (error) {
      console.error('Error getting user posts:', error);
      throw error;
    }
  },

  // Get a single post
  getPost: async (postId) => {
    try {
      const doc = await db.collection('posts').doc(postId).get();
      if (doc.exists) {
        return { id: doc.id, ...convertTimestamps(doc.data()) };
      } else {
        throw new Error('Post not found');
      }
    } catch (error) {
      console.error('Error getting post:', error);
      throw error;
    }
  },

  // Update a post
  updatePost: async (postId, updateData) => {
    try {
      await db.collection('posts').doc(postId).update({
        ...updateData,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating post:', error);
      throw error;
    }
  },

  // Delete a post
  deletePost: async (postId) => {
    try {
      await db.collection('posts').doc(postId).delete();
    } catch (error) {
      console.error('Error deleting post:', error);
      throw error;
    }
  },

  // Check if a user is an admin
  isUserAdmin: async (userId) => {
    if (!userId) return false;
    try {
      const adminDoc = await db.collection('admins').doc(userId).get();
      return adminDoc.exists;
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  }
};

// Users service
const usersService = {
  // Create a new user
  createUser: async (userData) => {
    try {
      const docRef = await db.collection('users').add({
        ...userData,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  },

  // Get user by ID
  getUser: async (userId) => {
    try {
      const doc = await db.collection('users').doc(userId).get();
      if (doc.exists) {
        return { id: doc.id, ...convertTimestamps(doc.data()) };
      } else {
        throw new Error('User not found');
      }
    } catch (error) {
      console.error('Error getting user:', error);
      throw error;
    }
  },

  // Update user
  updateUser: async (userId, updateData) => {
    try {
      await db.collection('users').doc(userId).update({
        ...updateData,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }
};

// Cards service
const cardsService = {
  // Get all cards
  getAllCards: async () => {
    try {
      const snapshot = await db.collection('cards').get();
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...convertTimestamps(doc.data())
      }));
    } catch (error) {
      console.error('Error getting cards:', error);
      throw error;
    }
  },

  // Search cards by name
  searchCards: async (searchTerm) => {
    try {
      const snapshot = await db.collection('cards')
        .where('name', '>=', searchTerm)
        .where('name', '<=', searchTerm + '\uf8ff')
        .limit(20)
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...convertTimestamps(doc.data())
      }));
    } catch (error) {
      console.error('Error searching cards:', error);
      throw error;
    }
  }
};

// Listings service
const listingsService = {
  // Create a new listing
  createListing: async (listingData) => {
    try {
      const docRef = await db.collection('listings').add({
        ...listingData,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating listing:', error);
      throw error;
    }
  },

  // Get all listings
  getAllListings: async () => {
    try {
      const snapshot = await db.collection('listings')
        .orderBy('createdAt', 'desc')
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...convertTimestamps(doc.data())
      }));
    } catch (error) {
      console.error('Error getting listings:', error);
      throw error;
    }
  },

  // Get listings by user
  getListingsByUser: async (userId) => {
    try {
      const snapshot = await db.collection('listings')
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...convertTimestamps(doc.data())
      }));
    } catch (error) {
      console.error('Error getting user listings:', error);
      throw error;
    }
  }
};

// Offers service
const offersService = {
  // Create a new offer
  createOffer: async (offerData) => {
    try {
      const docRef = await db.collection('offers').add({
        ...offerData,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating offer:', error);
      throw error;
    }
  },

  // Get offers by listing
  getOffersByListing: async (listingId) => {
    try {
      const snapshot = await db.collection('offers')
        .where('listingId', '==', listingId)
        .orderBy('createdAt', 'desc')
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...convertTimestamps(doc.data())
      }));
    } catch (error) {
      console.error('Error getting offers:', error);
      throw error;
    }
  }
};

// Transactions service
const transactionsService = {
  // Create a new transaction
  createTransaction: async (transactionData) => {
    try {
      const docRef = await db.collection('transactions').add({
        ...transactionData,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating transaction:', error);
      throw error;
    }
  },

  // Get transactions by user
  getTransactionsByUser: async (userId) => {
    try {
      const snapshot = await db.collection('transactions')
        .where('buyerId', '==', userId)
        .orderBy('createdAt', 'desc')
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...convertTimestamps(doc.data())
      }));
    } catch (error) {
      console.error('Error getting user transactions:', error);
      throw error;
    }
  }
};

// Reviews service
const reviewsService = {
  // Create a new review
  createReview: async (reviewData) => {
    try {
      const docRef = await db.collection('reviews').add({
        ...reviewData,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating review:', error);
      throw error;
    }
  },

  // Get reviews by user
  getReviewsByUser: async (userId) => {
    try {
      const snapshot = await db.collection('reviews')
        .where('revieweeId', '==', userId)
        .orderBy('createdAt', 'desc')
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...convertTimestamps(doc.data())
      }));
    } catch (error) {
      console.error('Error getting user reviews:', error);
      throw error;
    }
  }
};

module.exports = {
  postsService,
  usersService,
  cardsService,
  listingsService,
  offersService,
  transactionsService,
  reviewsService
};
