import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { createPost, createPostsFromList } from '../services/api';
import './Modal.css'; // Import the new modal-specific CSS

const CreatePostModal = ({ onPostCreated }) => {
    const { currentUser } = useAuth();
    const [formData, setFormData] = useState({
        cardName: '',
        postType: 'sell',
        price: '',
        condition: 'Near Mint',
        cardImageUrl: '',
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [isBatch, setIsBatch] = useState(false);
    const [batchText, setBatchText] = useState('');
    const [priceMode, setPriceMode] = useState('market');
    const [fixedPrice, setFixedPrice] = useState('');

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isBatch && !formData.cardName) {
            setError('Card name is required.');
            return;
        }
        if (isBatch && !batchText.trim()) {
            setError('Please paste a list of card names.');
            return;
        }
        setLoading(true);
        setError('');
        try {
            if (!isBatch) {
                const postData = {
                    ...formData,
                    contactEmail: currentUser.email,
                    contactPhone: currentUser.phoneNumber,
                };
                const res = await createPost(postData);
                onPostCreated(res.data);
            } else {
                const cardNames = batchText.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
                const payload = {
                    cardNames,
                    priceMode,
                    fixedPrice: priceMode === 'fixed' ? Number(fixedPrice) : undefined,
                    postType: formData.postType,
                    condition: formData.condition
                };
                const res = await createPostsFromList(payload);
                if (Array.isArray(res.data?.items)) {
                    for (const item of res.data.items) {
                        onPostCreated(item);
                    }
                }
            }
            document.getElementById('create_post_modal').close();
            setFormData({ cardName: '', postType: 'sell', price: '', condition: 'Near Mint', cardImageUrl: '' });
            setBatchText('');
            setFixedPrice('');
            setIsBatch(false);
        } catch (err) {
            setError('Failed to create post. Please try again.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <dialog id="create_post_modal" className="modal-overlay">
            <div className="modal-content">
                <form method="dialog">
                    <button className="modal-close-button">✕</button>
                </form>
                <h3 className="modal-title">Create a New Post</h3>
                <form onSubmit={handleSubmit} className="modal-form">
                    <div className="form-toggle">
                        <input id="batch-toggle" type="checkbox" checked={isBatch} onChange={(e) => setIsBatch(e.target.checked)} />
                        <label htmlFor="batch-toggle">Create from list</label>
                    </div>

                    {!isBatch ? (
                        <input type="text" name="cardName" placeholder="Card Name (e.g., Blue-Eyes White Dragon)" className="form-input" value={formData.cardName} onChange={handleChange} required />
                    ) : (
                        <textarea className="form-input" placeholder="Paste one card name per line" value={batchText} onChange={(e) => setBatchText(e.target.value)} />
                    )}
                    
                    <select name="postType" className="form-input" value={formData.postType} onChange={handleChange}>
                        <option value="sell">I want to Sell</option>
                        <option value="buy">I want to Buy</option>
                    </select>
                    
                    {!isBatch && (
                        <input type="number" name="price" placeholder="Price in ₪ (leave blank for market price)" className="form-input" value={formData.price} onChange={handleChange} />
                    )}
                    
                    <select name="condition" className="form-input" value={formData.condition} onChange={handleChange}>
                        <option>Mint</option>
                        <option>Near Mint</option>
                        <option>Lightly Played</option>
                        <option>Moderately Played</option>
                        <option>Heavily Played</option>
                        <option>Damaged</option>
                    </select>

                    {!isBatch && (
                        <input type="text" name="cardImageUrl" placeholder="Image URL (optional)" className="form-input" value={formData.cardImageUrl} onChange={handleChange} />
                    )}

                    {isBatch && (
                        <div className="form-group-inline">
                            <span>Price mode:</span>
                            <select className="form-input" value={priceMode} onChange={(e) => setPriceMode(e.target.value)}>
                                <option value="market">Market (TCGplayer)</option>
                                <option value="fixed">Fixed</option>
                                <option value="none">None</option>
                            </select>
                            {priceMode === 'fixed' && (
                                <input type="number" className="form-input" placeholder="₪ Fixed price" value={fixedPrice} onChange={(e) => setFixedPrice(e.target.value)} />
                            )}
                        </div>
                    )}
                    
                    {error && <p className="form-error">{error}</p>}
                    
                    <div className="modal-actions">
                        <button type="submit" className="btn btn--primary" disabled={loading}>
                            {loading ? <div className="loading-spinner"></div> : "Create Post"}
                        </button>
                    </div>
                </form>
            </div>
        </dialog>
    );
};

export default CreatePostModal;