import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, FacebookAuthProvider, RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";

// IMPORTANT: Replace with your Firebase project's configuration
const firebaseConfig = {
  apiKey: "AIzaSyCVtzbsX6Vu6T8Z2-XqVq3pqANFJvZdVp8",
  authDomain: "tcg-cards-market-chat.firebaseapp.com",
  projectId: "tcg-cards-market-chat",
  storageBucket: "tcg-cards-market-chat.firebasestorage.app",
  messagingSenderId: "904095739467",
  appId: "1:904095739467:web:3453b6fe5b4ce67e0927ce",
  measurementId: "G-MWNXW8C57C"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const facebookProvider = new FacebookAuthProvider();

// Helper functions for phone auth
export const getRecaptchaVerifier = (elementId) => {
  return new RecaptchaVerifier(auth, elementId, {
    'size': 'invisible'
  });
};

export const sendPhoneVerification = (phoneNumber, verifier) => {
  return signInWithPhoneNumber(auth, phoneNumber, verifier);
};
