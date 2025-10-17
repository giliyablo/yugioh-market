import admin from 'firebase-admin';
import { fileURLToPath } from 'url';
import path from 'path';

// --- Initialize Firebase Admin ---
import('dotenv').then(dotenv => {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    dotenv.config({ path: path.resolve(__dirname, '../.env') });
    
    try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });
        console.log('Firebase Admin SDK initialized successfully.');
        clearPostData(); // Start the clearing process
    } catch (error) {
        console.error('🔴 Failed to initialize Firebase Admin SDK. Make sure your FIREBASE_SERVICE_ACCOUNT_JSON in the root .env file is correct.');
        console.error(error.message);
        process.exit(1);
    }
});

async function clearPostData() {
    console.log('Starting to clear post prices and images...');

    const db = admin.firestore();
    const postsRef = db.collection('posts');

    try {
        const snapshot = await postsRef.get();
        if (snapshot.empty) {
            console.log('No posts found to update.');
            return;
        }

        const batch = db.batch();
        snapshot.docs.forEach(doc => {
            const postRef = doc.ref;
            batch.update(postRef, {
                price: null,
                isApiPrice: true,
                cardImageUrl: 'https://placehold.co/243x353?text=No+Image',
                'enrichment.priceStatus': 'pending',
                'enrichment.imageStatus': 'pending'
            });
        });

        await batch.commit();
        console.log(`✅ Successfully cleared data for ${snapshot.size} posts.`);

    } catch (error) {
        console.error('❌ Failed to clear post data:', error);
    }
}