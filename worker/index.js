require('dotenv').config();
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const { processJob } = require('./jobs');

// --- Initialize Express App ---
const app = express();
const PORT = process.env.PORT || 4000;

// --- Middleware ---
app.use(cors());
app.use(express.json());

// --- Health Check Endpoint ---
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});


// --- Initialize Firebase Admin SDK ---
try {
    if (admin.apps.length === 0) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log("Worker: Firebase Admin SDK initialized successfully.");
    }
} catch (error) {
    console.error("Worker: Error initializing Firebase Admin SDK:", error);
    process.exit(1);
}

const db = admin.firestore();

function listenForJobs() {
    console.log("Worker is listening for new jobs...");
    const query = db.collection('jobs').where('status', '==', 'pending');

    query.onSnapshot(snapshot => {
        snapshot.docChanges().forEach(change => {
            if (change.type === 'added') {
                const jobDoc = change.doc;
                const jobData = jobDoc.data();
                const jobId = jobDoc.id;

                console.log(`Processing job ${jobId} for card: ${jobData.cardName}`);
                jobDoc.ref.update({ status: 'running' }).then(() => {
                    processJob(db, jobData)
                        .then(() => {
                            console.log(`Job ${jobId} completed successfully.`);
                            return jobDoc.ref.update({ status: 'completed' });
                        })
                        .catch(error => {
                            console.error(`Job ${jobId} failed:`, error);
                            return jobDoc.ref.update({ status: 'failed', error: error.message });
                        });
                });
            }
        });
    }, err => {
        console.error("Error listening to jobs collection:", err);
    });
}

app.listen(PORT, () => {
    console.log(`Worker server is running on port ${PORT}`);
    listenForJobs();
});
