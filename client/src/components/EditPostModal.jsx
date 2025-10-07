import React, { useState, useEffect } from 'react';
import { updatePost, fetchCardImage, fetchMarketPrice } from '../services/api';
import { ImageDown, Search } from 'lucide-react';

const EditPostModal = ({ post, onClose, onUpdate }) => {
    const [formData, setFormData] = useState(post);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // This effect ensures the form resets if a new post is selected
    useEffect(() => {
        setFormData(post);
    }, [post]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleFetchImage = async () => {
        if (!formData.cardName) return;
        setLoading(true);
        try {
            const res = await fetchCardImage(formData.cardName);
            setFormData({ ...formData, cardImageUrl: res.data.imageUrl });
        } catch (err) {
            console.error("Failed to fetch image", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const { data } = await updatePost(post._id, formData);
            onUpdate(data); // This calls handlePostUpdate in HomePage
        } catch (err) {
            setError('Failed to update post.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // By adding the `modal-open` class, its visibility is controlled by the parent.
    return (
        <dialog className="modal modal-open">
            <div className="modal-box">
                {/* This button now correctly calls the onClose function */}
                <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" onClick={onClose}>✕</button>
                
                <h3 className="font-bold text-lg">Edit Post</h3>
                <form onSubmit={handleSubmit} className="py-4 space-y-4">
                    <div className="form-control">
                        <label className="label"><span className="label-text">Card Name</span></label>
                        <div className="join w-full">
                            <input type="text" name="cardName" placeholder="Card Name" className="input input-bordered w-full join-item" value={formData.cardName || ''} onChange={handleChange} required />
                            <button type="button" className="btn join-item" onClick={handleFetchImage} disabled={loading || !formData.cardName}>
                                {loading ? <span className="loading loading-spinner-xs"></span> : <ImageDown size={16} />}
                            </button>
                        </div>
                    </div>
                    
                    <div className="form-control">
                        <label className="label"><span className="label-text">Post Type</span></label>
                        <select name="postType" className="select select-bordered w-full" value={formData.postType || 'sell'} onChange={handleChange}>
                            <option value="sell">I want to Sell</option>
                            <option value="buy">I want to Buy</option>
                        </select>
                    </div>

                    <div className="form-control">
                        <label className="label"><span className="label-text">Price ($)</span></label>
                        <input type="number" name="price" placeholder="Price" className="input input-bordered w-full" value={formData.price || ''} onChange={handleChange} />
                    </div>

                    <div className="form-control">
                        <label className="label"><span className="label-text">Condition</span></label>
                        <select name="condition" className="select select-bordered w-full" value={formData.condition || 'Near Mint'} onChange={handleChange}>
                            <option>Mint</option>
                            <option>Near Mint</option>
                            <option>Lightly Played</option>
                            <option>Moderately Played</option>
                            <option>Heavily Played</option>
                            <option>Damaged</option>
                        </select>
                    </div>
                    
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    
                    <div className="modal-action">
                        <button type="button" className="btn" onClick={onClose} disabled={loading}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? <span className="loading loading-spinner"></span> : "Save Changes"}
                        </button>
                    </div>
                </form>
            </div>
             {/* Add a backdrop that also closes the modal */}
            <div className="modal-backdrop" onClick={onClose}></div>
        </dialog>
    );
};

export default EditPostModal;

