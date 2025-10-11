import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, FacebookAuthProvider, RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// IMPORTANT: Replace with your Firebase project's configuration
const firebaseConfig = {
  "type": "service_account",
  "project_id": "fourth-arena-474414-h6",
  "private_key_id": "ecbef44a41d5ab0fd265b115a7d8a0607fa8bfe1",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDBqvwSZlSyLgpe\n5TYI/yhV82NHHfwrWpK2CrEJbGdG2pTWIt42vp1iF6VtmCuNYyRy4vOyMn4k+jr3\nXqt9rLrSDNpVHbXX3t9gTAfU2UBOnHV5j/8oX7lABsozezb5a3KeBKX/J6ijAH8H\ncsThUBuXy0h1Zr4NWHHpTQnei54YNg57umKWj01Fx6UdTNAJIR04auKOD/Yuu/5F\nfooYsQfXMl/sn9MR+m+JJqJ1/E72qvwsaN7KWKos/EvMZAiLMqobfY8Km9o2rggP\nZ6jaG7YHsWLc76GSK0uVA1O7LIfO0mSViaLHjPySNkma5KgCbT7zodMTWeNR0PPb\n6UaAf5p5AgMBAAECggEARK9qhPAL+8F+ZhduqZQs7wbJ3/APfiS6QZvbG9d5bVSa\nUrO9Ebdaw+5U+mBsmdFenOxGt51WxbCFdzP5KDI5c8OhL2zBEFV37YQphuCiAP9W\nXo2mVeBVKBMAZW++mIj19nr5kFu1YFINu0uF7c7malhrU0/j+YGzrKVo6aekozrx\nWAwatbq22ZUKsoBeyRgQAnCk2jXmFBzJoJo+xHWOHX2DYg32GT05b6cEBhBaKU4p\n/c2P77PX2Dwr93ZvptbAUyA53VH0PWThtx+Bca93Ulj7WNBNiTcXyjKlggowIxih\n9Iw9u5gW8E5gL3II45GqyP5xofM9VdmAh+Oxe+ghDQKBgQD+3hCcntNCVHAKUDGy\nUVGvneMtzVKDjP/DPPmZFnlfwKFaWg1wJupQv2AqnezNYBQLTyjJF5j1S0UcRIxe\n4BVc1kgqXaaLYb+Mvcyx0hFw+oimx8agEHERzWfnCYVoBu5zxWHNQ9ycI1IZ+rwq\nzeGimxoDPHVAOvONd7IIg+KpwwKBgQDCh0y31qeVTylGxNVnpnyfjAGg6ww9PxhB\nic3Iz4FNJPztkQ8hS0+1Q4UR9oV24ucK/XA4F549Y6Mo7RzDhsN69UMsBjUNG2Mh\naS8b5LU9tQKbe7dNxgH7eE0QDt5FBvtElYlcS55JJSM/R1D2TFzXUaIYdjwselLc\nXq8rk13rEwKBgF1EiJG4MZlRaxrrE/Sse5cn0U4emDaZ77LT6odSSSJ4TNPSpp5H\nL3JTRm7yEglqQouM8WD9qLUDUYwxrai+mjK6G/idAuh44e8wOetM86MDm+RksVQ8\nEBSytXY/7rkN6E8niU3jqqTc7BujvR5w70RhPBi5FDNoH17C0bz5/oWfAoGBAKzs\n/8sRG8qEI4pQofDRNEnUeQIm0KuFcjeYnAGeTTBZ6Cn74LpVK5dUXW/5eO2ViZPg\ndii2/ilOcJWKKx65pv6gFsWFAxYSuY3S5ljieCdRyO6VDP8rPUnhyIe03+v259kx\nIXmVkzEsvWecKyG4AnQ6kmEygg179DsIRKn1B/FXAoGBAJwNJ9bivkxcyDcqtMB2\nMs2JVkl9F/Dlj4ap44y7B+BQaxWz2LWcahHmZgpXMxgtJm63vKno6z1nq16+tLIJ\n0+9zQvV7fwkuxQemgmwyqKcCGG8oWvdBleshwgMuDyrvrwxcH4LT7wM9gHfT5CHW\nrseP9BEv3LA3t9VtpvkSlQwz\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-fbsvc@fourth-arena-474414-h6.iam.gserviceaccount.com",
  "client_id": "111382441001744087903",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40fourth-arena-474414-h6.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
}


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
