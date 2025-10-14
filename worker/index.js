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
        if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
            console.log("Worker: Firebase Admin SDK initialized successfully.");
        } else {
            console.error("Worker: FIREBASE_SERVICE_ACCOUNT_JSON not set. Exiting.");
            process.exit(1);
        }
    }
} catch (error) {
    console.error("Worker: Error initializing Firebase Admin SDK:", error);
    process.exit(1);
}

// Get the Firestore instance AFTER initializing
const db = admin.firestore();

/**
 * Listens to the 'jobs' collection for new documents with 'pending' status.
 */
function listenForJobs() {
    console.log("Worker is listening for new jobs...");

    const query = db.collection('jobs')
        .where('status', '==', 'pending')
        .orderBy('createdAt');

    // Listen for new documents
    query.onSnapshot(snapshot => {
        snapshot.docChanges().forEach(change => {
            if (change.type === 'added') {
                const jobDoc = change.doc;
                const jobData = jobDoc.data();
                const jobId = jobDoc.id;

                console.log(`New job received: ${jobId} for card "${jobData.cardName}"`);

                // Mark the job as 'running' to prevent other workers from picking it up
                jobDoc.ref.update({ status: 'running', startTime: admin.firestore.FieldValue.serverTimestamp() })
                    .then(() => {
                        // Execute the job, passing the db instance
                        return processJob(db, jobData);
                    })
                    .then(() => {
                        // Mark the job as 'completed'
                        console.log(`Job completed successfully: ${jobId}`);
                        return jobDoc.ref.update({ status: 'completed', endTime: admin.firestore.FieldValue.serverTimestamp() });
                    })
                    .catch(error => {
                        // Mark the job as 'failed' if any step fails
                        console.error(`Job failed: ${jobId}`, error);
                        return jobDoc.ref.update({ 
                            status: 'failed', 
                            error: error.message,
                            endTime: admin.firestore.FieldValue.serverTimestamp()
                        });
                    });
            }
        });
    }, err => {
        console.error("FATAL: Error listening to jobs collection:", err);
    });
}

// --- Start Server and Job Listener ---
app.listen(PORT, () => {
    console.log(`Worker server is running on port ${PORT}`);
    // Start listening for jobs only after the server is up
    listenForJobs();
});
