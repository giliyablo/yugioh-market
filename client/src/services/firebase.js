import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, FacebookAuthProvider, RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Firebase Web App Configuration
const firebaseConfig = {
  apiKey: "AIzaSyDe58TZhxedmVGuzeVU5shEXSLvJQwytXY",
  authDomain: "fourth-arena-474414-h6.firebaseapp.com",
  projectId: "fourth-arena-474414-h6",
  storageBucket: "fourth-arena-474414-h6.firebasestorage.app",
  messagingSenderId: "650223673903",
  appId: "1:650223673903:web:6a6ef829a6d98f3b8edcda",
  measurementId: "G-3B55BNWZYE"
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
