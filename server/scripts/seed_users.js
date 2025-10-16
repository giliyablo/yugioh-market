import fs from 'fs';
import path from 'path';
import admin from 'firebase-admin';
import { fileURLToPath } from 'url';

// --- Configuration ---
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
        createUsers(); // Start the user creation process
    } catch (error) {
        console.error('🔴 Failed to initialize Firebase Admin SDK. Make sure your FIREBASE_SERVICE_ACCOUNT_JSON in the root .env file is correct.');
        console.error(error.message);
        process.exit(1);
    }
});

async function createUsers() {
    console.log('Starting user creation process...');

    const dataPath = path.join(__dirname, DATA_FILE);
    if (!fs.existsSync(dataPath)) {
        console.error(`🔴 Error: Data file not found at ${dataPath}`);
        return;
    }

    const posts = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    
    // Use a Map to get a unique list of users by UID
    const uniqueUsers = new Map();
    posts.forEach(post => {
        if (post.user && post.user.uid) {
            uniqueUsers.set(post.user.uid, post.user);
        }
    });

    const usersToCreate = Array.from(uniqueUsers.values());
    console.log(`Found ${usersToCreate.length} unique users to create.`);

    for (const [index, user] of usersToCreate.entries()) {
        try {
            console.log(`[${index + 1}/${usersToCreate.length}] Creating user: "${user.displayName}" (uid: ${user.uid})`);
            
            // Check if user already exists
            try {
                await admin.auth().getUser(user.uid);
                console.log(`  🟡 User "${user.displayName}" with UID "${user.uid}" already exists. Skipping.`);
                continue; // Skip to the next user
            } catch (error) {
                if (error.code !== 'auth/user-not-found') {
                    throw error; // Re-throw other errors
                }
                // If user not found, proceed to create
            }

            await admin.auth().createUser({
                uid: user.uid,
                displayName: user.displayName,
                phoneNumber: user.contact.phoneNumber,
                disabled: false
            });

            console.log(`  ✅ Successfully created user "${user.displayName}"`);

        } catch (error) {
            console.error(`  ❌ Failed to create user "${user.displayName}"`);
            console.error('     Error:', error.code, error.message);
        }
        // Small delay to avoid hitting API rate limits
        await new Promise(resolve => setTimeout(resolve, 50));
    }

    console.log('🎉 User creation process complete.');
}