import React, { useState } from 'react';
import { createPostsFromWhatsapp } from '../services/api'; // We will create this function
import LoadingSpinner from './LoadingSpinner';
import './Modal.css';
import '../pages/HomePage.css';

const AdminBulkAdd = () => {
    const [bulkText, setBulkText] = useState('');
    const [loading, setLoading] = useState(false);
    const [feedback, setFeedback] = useState({ message: '', type: '' });

    const parseMessages = (text) => {
        const posts = [];
        const lines = text.split('\n').filter(line => line.trim() !== '');

        // Regex to capture phone number and message from a common WhatsApp format
        const messageRegex = /\[.*?\] ([^:]+): (.*)/;

        for (const line of lines) {
            const match = line.match(messageRegex);
            if (!match) continue;

            const [, phoneNumber, message] = match;
            let postType = '';
            let cleanedMessage = message.toLowerCase();

            if (cleanedMessage.includes('מוכר') || cleanedMessage.includes('sell')) {
                postType = 'sell';
                cleanedMessage = cleanedMessage.replace('מוכר', '').replace('sell', '');
            } else if (cleanedMessage.includes('מחפש') || cleanedMessage.includes('buy')) {
                postType = 'buy';
                cleanedMessage = cleanedMessage.replace('מחפש', '').replace('buy', '');
            }

            if (postType) {
                // Split card names by comma
                const cardNames = cleanedMessage.split(',')
                    .map(name => name.trim())
                    .filter(name => name);
                
                for (const cardName of cardNames) {
                    posts.push({ phoneNumber, postType, cardName });
                }
            }
        }
        return posts;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setFeedback({ message: '', type: '' });

        const parsedPosts = parseMessages(bulkText);

        if (parsedPosts.length === 0) {
            setFeedback({ message: 'No valid posts found in the text.', type: 'error' });
            setLoading(false);
            return;
        }

        try {
            const res = await createPostsFromWhatsapp({ posts: parsedPosts });
            setFeedback({ message: res.message || `Successfully created ${res.createdPosts.length} posts.`, type: 'success' });
            setBulkText(''); // Clear textarea on success
        } catch (error) {
            const errorMessage = error.response?.data?.msg || 'An error occurred.';
            setFeedback({ message: `Failed to create posts: ${errorMessage}`, type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="admin-bulk-add">
            <h2>Bulk Add Posts from WhatsApp</h2>
            <p>Paste messages below. The format should include the contact number and keywords like 'sell'/'מוכר' or 'buy'/'מחפש'.</p>
            <form onSubmit={handleSubmit} className="modal-form">
                <textarea
                    className="form-input"
                    rows="15"
                    placeholder="Paste WhatsApp messages here..."
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                />

                {feedback.message && (
                    <p className={feedback.type === 'error' ? 'form-error' : 'form-success'}>{feedback.message}</p>
                )}

                <div className="modal-actions">
                    <button type="submit" className="btn btn--primary" disabled={loading}>
                        {loading ? <LoadingSpinner /> : `Create ${parseMessages(bulkText).length} Posts`}
                    </button>
                </div>
            </form>
            <style jsx>{`
              .admin-bulk-add {
                background-color: var(--color-surface);
                padding: 2rem;
                border-radius: 12px;
                border: 1px solid var(--color-border);
              }
              .form-success {
                color: var(--color-success);
              }
            `}</style>
        </div>
    );
};

export default AdminBulkAdd;