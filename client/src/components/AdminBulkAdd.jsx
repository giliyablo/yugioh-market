import React, { useState } from 'react';
import { createPostsFromWhatsapp } from '../services/api'; 
import LoadingSpinner from './LoadingSpinner';
import './Modal.css';
import '../pages/HomePage.css';

const AdminBulkAdd = () => {
    const [bulkText, setBulkText] = useState('');
    const [loading, setLoading] = useState(false);
    const [feedback, setFeedback] = useState({ message: '', type: '' });

    const parseMessages = (text) => {
        const posts = [];
        const lines = text.split('\n');

        let currentUser = '';
        let currentPostType = '';

        const userRegex = /\[.*?\] ([^:]+):/;

        for (const line of lines) {
            const userMatch = line.match(userRegex);
            if (userMatch) {
                currentUser = userMatch[1].trim();
                currentPostType = ''; // Reset for the new user's message
            }

            const trimmedLine = line.trim();
            const lowerCaseLine = trimmedLine.toLowerCase();

            const isBuy = lowerCaseLine.startsWith('buy:') || lowerCaseLine.startsWith('מחפש') || lowerCaseLine.startsWith('קונה');
            const isSell = lowerCaseLine.startsWith('sell:') || lowerCaseLine.startsWith('מוכר');

            if (isBuy || isSell) {
                currentPostType = isBuy ? 'buy' : 'sell';
                const restOfLine = trimmedLine.substring(trimmedLine.indexOf(':') + 1).trim();
                if (restOfLine) {
                    const cardName = restOfLine.replace(/(\d+x|x\d+|\d+)\s*/, '').trim();
                    if (cardName) {
                        posts.push({ phoneNumber: currentUser, postType: currentPostType, cardName });
                    }
                }
            } else if (currentUser && currentPostType && trimmedLine) {
                const cardName = trimmedLine.replace(/(\d+x|x\d+|\d+)\s*/, '').trim();
                if (cardName) {
                    posts.push({ phoneNumber: currentUser, postType: currentPostType, cardName });
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
            setFeedback({ message: res.data.message || `Successfully created ${res.data.createdPosts.length} posts.`, type: 'success' });
            setBulkText(''); // Clear textarea on success
        } catch (error) {
            const errorMessage = error.response?.data?.msg || 'An error occurred.';
            setFeedback({ message: `Failed to create posts: ${errorMessage}`, type: 'error' });
        } finally {
            setLoading(false);
        }
    };
    
    const parsedPosts = parseMessages(bulkText);

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
                    <button type="submit" className="btn btn--primary" disabled={loading || parsedPosts.length === 0}>
                        {loading ? <LoadingSpinner /> : `Create ${parsedPosts.length} Posts`}
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