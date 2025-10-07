import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { updatePost } from '../services/api';
import './Modal.css'; // Import modal-specific styles

const EditPostModal = ({ post, onClose, onUpdate }) => {
    const { currentUser } = useAuth();
    const [formData, setFormData] = useState(post);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setFormData(post);
    }, [post]);
	
    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.cardName) {
            setError('Card name is required.');
            return;
        }

        setLoading(true);
        setError('');
        try {
            const updatePayload = {
                cardName: formData.cardName,
                postType: formData.postType,
                price: formData.price,
                condition: formData.condition,
                cardImageUrl: formData.cardImageUrl
            };

            const { data } = await updatePost(post._id, updatePayload);
            onUpdate(data); // This will update the post in the parent and close the modal
																				
        } catch (err) {
            setError('Failed to update post.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };
	
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <button type="button" className="modal-close-button" onClick={onClose}>
                    ✕
                </button>

                <h3 className="modal-title">Edit Post</h3>

                <form onSubmit={handleSubmit} className="modal-form">
                    <input
                        type="text"
                        name="cardName"
                        placeholder="Card Name"
                        className="form-input"
                        value={formData.cardName || ''}
                        onChange={handleChange}
                        required
                    />

                    <select
                        name="postType"
                        className="form-input"
                        value={formData.postType || 'sell'}
                        onChange={handleChange}
                    >
                        <option value="sell">I want to Sell</option>
                        <option value="buy">I want to Buy</option>
                    </select>

                    <input
                        type="number"
                        name="price"
                        placeholder="Price in $ (leave blank for market price)"
                        className="form-input"
                        value={formData.price || ''}
                        onChange={handleChange}
                    />

                    <select
                        name="condition"
                        className="form-input"
                        value={formData.condition || 'Near Mint'}
                        onChange={handleChange}
                    >
                        <option>Mint</option>
                        <option>Near Mint</option>
                        <option>Lightly Played</option>
                        <option>Moderately Played</option>
                        <option>Heavily Played</option>
                        <option>Damaged</option>
                    </select>

                    <input
                        type="text"
                        name="cardImageUrl"
                        placeholder="Image URL (optional)"
                        className="form-input"
                        value={formData.cardImageUrl || ''}
                        onChange={handleChange}
                    />

                    {error && <p className="form-error">{error}</p>}

                    <div className="modal-actions">
                        <button type="submit" className="btn btn--primary" disabled={loading}>
                            {loading ? <div className="loading-spinner"></div> : 'Update Post'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditPostModal;