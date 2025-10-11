import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  onSnapshot,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from './firebase.js';

// Collection references
const postsCollection = collection(db, 'posts');
const usersCollection = collection(db, 'users');
const cardsCollection = collection(db, 'cards');
const listingsCollection = collection(db, 'listings');
const offersCollection = collection(db, 'offers');
const transactionsCollection = collection(db, 'transactions');
const reviewsCollection = collection(db, 'reviews');

// Posts CRUD operations
export const postsService = {
  // Create a new post
  createPost: async (postData) => {
    try {
      const docRef = await addDoc(postsCollection, {
        ...postData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
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
      const q = query(postsCollection, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting posts:', error);
      throw error;
    }
  },

  // Get posts by user
  getPostsByUser: async (userId) => {
    try {
      const q = query(
        postsCollection, 
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting user posts:', error);
      throw error;
    }
  },

  // Get a single post
  getPost: async (postId) => {
    try {
      const docRef = doc(postsCollection, postId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
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
      const docRef = doc(postsCollection, postId);
      await updateDoc(docRef, {
        ...updateData,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating post:', error);
      throw error;
    }
  },

  // Delete a post
  deletePost: async (postId) => {
    try {
      const docRef = doc(postsCollection, postId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting post:', error);
      throw error;
    }
  },

  // Subscribe to posts changes (real-time updates)
  subscribeToPosts: (callback) => {
    const q = query(postsCollection, orderBy('createdAt', 'desc'));
    return onSnapshot(q, (querySnapshot) => {
      const posts = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(posts);
    });
  }
};

// Users CRUD operations
export const usersService = {
  // Create a new user
  createUser: async (userData) => {
    try {
      const docRef = await addDoc(usersCollection, {
        ...userData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
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
      const docRef = doc(usersCollection, userId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
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
      const docRef = doc(usersCollection, userId);
      await updateDoc(docRef, {
        ...updateData,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }
};

// Cards CRUD operations
export const cardsService = {
  // Get all cards
  getAllCards: async () => {
    try {
      const querySnapshot = await getDocs(cardsCollection);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting cards:', error);
      throw error;
    }
  },

  // Search cards by name
  searchCards: async (searchTerm) => {
    try {
      const q = query(
        cardsCollection,
        where('name', '>=', searchTerm),
        where('name', '<=', searchTerm + '\uf8ff'),
        limit(20)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error searching cards:', error);
      throw error;
    }
  }
};

// Listings CRUD operations
export const listingsService = {
  // Create a new listing
  createListing: async (listingData) => {
    try {
      const docRef = await addDoc(listingsCollection, {
        ...listingData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
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
      const q = query(listingsCollection, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting listings:', error);
      throw error;
    }
  },

  // Get listings by user
  getListingsByUser: async (userId) => {
    try {
      const q = query(
        listingsCollection,
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting user listings:', error);
      throw error;
    }
  }
};

// Offers CRUD operations
export const offersService = {
  // Create a new offer
  createOffer: async (offerData) => {
    try {
      const docRef = await addDoc(offersCollection, {
        ...offerData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
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
      const q = query(
        offersCollection,
        where('listingId', '==', listingId),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting offers:', error);
      throw error;
    }
  }
};

// Transactions CRUD operations
export const transactionsService = {
  // Create a new transaction
  createTransaction: async (transactionData) => {
    try {
      const docRef = await addDoc(transactionsCollection, {
        ...transactionData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
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
      const q = query(
        transactionsCollection,
        where('buyerId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting user transactions:', error);
      throw error;
    }
  }
};

// Reviews CRUD operations
export const reviewsService = {
  // Create a new review
  createReview: async (reviewData) => {
    try {
      const docRef = await addDoc(reviewsCollection, {
        ...reviewData,
        createdAt: serverTimestamp()
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
      const q = query(
        reviewsCollection,
        where('revieweeId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting user reviews:', error);
      throw error;
    }
  }
};
