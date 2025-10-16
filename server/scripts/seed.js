import fs from 'fs';
import path from 'path';
import admin from 'firebase-admin';
import axios from 'axios';
import { fileURLToPath } from 'url';

// --- Configuration ---
const API_BASE_URL = 'http://localhost:5000/api';
const DATA_FILE = 'yugioh_posts_corrected.json';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// --- Initialize Firebase Admin ---
// Make sure your root .env file has the FIREBASE_SERVICE_ACCOUNT_JSON
import('dotenv').then(dotenv => {
    dotenv.config({ path: path.resolve(__dirname, '../.env') });
    
    try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });
        console.log('Firebase Admin SDK initialized successfully.');
        main(); // Start the seeding process
    } catch (error) {
        console.error('🔴 Failed to initialize Firebase Admin SDK. Make sure your FIREBASE_SERVICE_ACCOUNT_JSON in the root .env file is correct.');
        console.error(error.message);
        process.exit(1);
    }
});


// --- Main Seeding Logic ---
async function main() {
    console.log('Starting the seeding process...');

    const dataPath = path.join(__dirname, DATA_FILE);
    if (!fs.existsSync(dataPath)) {
        console.error(`🔴 Error: Data file not found at ${dataPath}`);
        return;
    }

    const posts = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    console.log(`Found ${posts.length} posts to upload.`);

    const tokenCache = new Map();

    for (const [index, post] of posts.entries()) {
        try {
            const { uid, displayName } = post.user;

            // Get auth token for the user, use cache if available
            let token;
            if (tokenCache.has(uid)) {
                token = tokenCache.get(uid);
            } else {
                console.log(`- Generating auth token for user: ${displayName} (uid: ${uid})`);
                token = await admin.auth().createCustomToken(uid, { displayName });
                tokenCache.set(uid, token);
            }

            // The createPost endpoint requires a valid Firebase ID token, not a custom token.
            // We need to "sign in" with the custom token to get an ID token.
            // This is a workaround since we don't have a client-side auth flow.
            // NOTE: This part requires your API key from the Firebase project settings.
            const apiKey = process.env.FIREBASE_API_KEY; // Make sure to add this to your .env file!
            if (!apiKey) {
                console.error("🔴 FIREBASE_API_KEY is not set in your .env file. This is required to exchange the custom token for an ID token.");
                process.exit(1);
            }

            const { data: { idToken } } = await axios.post(
                `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`,
                { token, returnSecureToken: true }
            );

            // Create the post using the authenticated API endpoint
            console.log(`[${index + 1}/${posts.length}] Uploading post for card: "${post.cardName}"...`);
            await axios.post(`${API_BASE_URL}/posts`, post, {
                headers: {
                    'Authorization': `Bearer ${idToken}`
                }
            });

            console.log(`  ✅ Successfully created post for "${post.cardName}"`);

            // Small delay to avoid overwhelming the local server
            await new Promise(resolve => setTimeout(resolve, 100));

        } catch (error) {
            console.error(`  ❌ Failed to create post for "${post.cardName}"`);
            const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;
            console.error('     Error:', errorMessage);
        }
    }
    console.log('🎉 Seeding process complete.');
}
