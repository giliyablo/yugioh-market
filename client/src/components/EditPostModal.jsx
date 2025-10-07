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

    useEffect(() => {
        const modal = document.getElementById(`edit_post_modal_${post._id}`);
        if (modal) {
            modal.showModal();
        }
        // Cleanup function to close the modal if the component unmounts
        return () => {
            if (modal && modal.open) {
                modal.close();
            }
        };
    }, [post._id]);

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
                cardImageUrl: formData.cardImageUrl,
                contactEmail: currentUser.email,
                contactPhone: currentUser.phoneNumber,
            };

            const { data } = await updatePost(post._id, updatePayload);
            onUpdate(data);
            onClose(); // This will trigger the modal to be removed from the DOM
        } catch (err) {
            setError('Failed to update post.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Use a unique ID for each modal instance to prevent conflicts
    const modalId = `edit_post_modal_${post._id}`;

    return (
        <dialog id={modalId} className="modal-overlay" onClose={onClose}>
            <div className="modal-content">
                <button type="button" className="modal-close-button" onClick={onClose}>
                    ✕
                </button>

                <h3 className="modal-title">Edit Post</h3>

                <form onSubmit={handleSubmit} className="modal-form">
                    <input
                        type="text"
                        name="cardName"
                        placeholder="Card Name (e.g., Blue-Eyes White Dragon)"
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
                        placeholder="Price in ₪ (leave blank for market price)"
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
        </dialog>
    );
};

export default EditPostModal;