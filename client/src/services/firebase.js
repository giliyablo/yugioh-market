import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, FacebookAuthProvider, RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// IMPORTANT: Replace with your Firebase project's configuration
const firebaseConfig = {
  apiKey: "AIzaSyC56Jt10JNqBYgq2_uIMurAdZwZqHZ5bSg",
  authDomain: "local-tcg-market-chat.firebaseapp.com",
  projectId: "local-tcg-market-chat",
  storageBucket: "local-tcg-market-chat.firebasestorage.app",
  messagingSenderId: "28158475801",
  appId: "1:28158475801:web:593157fbf622ae5e483488",
  measurementId: "G-SW97RJM0S4"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
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
