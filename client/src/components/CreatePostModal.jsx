import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { createPost } from '../services/api';

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
            const postData = {
                ...formData,
                contactEmail: currentUser.email,
                contactPhone: currentUser.phoneNumber,
            };
            const res = await createPost(postData);
            onPostCreated(res.data); // Notify parent component
            document.getElementById('create_post_modal').close(); // Close modal
            setFormData({ cardName: '', postType: 'sell', price: '', condition: 'Near Mint', cardImageUrl: '' }); // Reset form
        } catch (err) {
            setError('Failed to create post. Please try again.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <dialog id="create_post_modal" className="modal">
            <div className="modal-box">
                <form method="dialog">
                    <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
                </form>
                <h3 className="font-bold text-lg">Create a New Post</h3>
                <form onSubmit={handleSubmit} className="py-4 space-y-4">
                    {/* Form fields */}
                    <input type="text" name="cardName" placeholder="Card Name (e.g., Blue-Eyes White Dragon)" className="input input-bordered w-full" value={formData.cardName} onChange={handleChange} required />
                    <select name="postType" className="select select-bordered w-full" value={formData.postType} onChange={handleChange}>
                        <option value="sell">I want to Sell</option>
                        <option value="buy">I want to Buy</option>
                    </select>
                    <input type="number" name="price" placeholder="Price in ₪ (leave blank for market price)" className="input input-bordered w-full" value={formData.price} onChange={handleChange} />
                    <select name="condition" className="select select-bordered w-full" value={formData.condition} onChange={handleChange}>
                        <option>Mint</option>
                        <option>Near Mint</option>
                        <option>Lightly Played</option>
                        <option>Moderately Played</option>
                        <option>Heavily Played</option>
                        <option>Damaged</option>
                    </select>
                    <input type="text" name="cardImageUrl" placeholder="Image URL (optional)" className="input input-bordered w-full" value={formData.cardImageUrl} onChange={handleChange} />
                    
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    
                    <div className="modal-action">
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? <span className="loading loading-spinner"></span> : "Create Post"}
                        </button>
                    </div>
                </form>
            </div>
        </dialog>
    );
};

export default CreatePostModal;
