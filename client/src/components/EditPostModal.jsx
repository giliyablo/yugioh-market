import React, { useState, useEffect } from 'react';
import { updatePost, fetchCardImage } from '../services/api';
import { ImageDown } from 'lucide-react';

const EditPostModal = ({ post, onClose, onUpdate }) => {
    // This state will now correctly update when the 'post' prop changes, thanks to the useEffect below.
    const [formData, setFormData] = useState(post);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // *** THE CRUCIAL FIX ***
    // This effect hook runs whenever the 'post' prop changes.
    // It ensures the form's data is always in sync with the selected post.
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
            // Only send the fields that are allowed to be updated.
            const updatePayload = {
                cardName: formData.cardName,
                postType: formData.postType,
                price: formData.price,
                condition: formData.condition,
            };
            const { data } = await updatePost(post._id, updatePayload);
            onUpdate(data);
        } catch (err) {
            setError('Failed to update post.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <dialog id="edit_post_modal" className="modal modal-open">
            <div className="modal-box">
                <form method="dialog">
                    <button type="button" className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" onClick={onClose}>✕</button>
                </form>
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
                        <input type="number" step="0.01" name="price" placeholder="Price" className="input input-bordered w-full" value={formData.price || ''} onChange={handleChange} />
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
            <form method="dialog" className="modal-backdrop">
              <button type="button" onClick={onClose}>close</button>
            </form>
        </dialog>
    );
};

export default EditPostModal;

