import React, { useState } from 'react';
import { updatePost } from '../services/api';

const EditPostModal = ({ post, onClose, onUpdate }) => {
    const [formData, setFormData] = useState({
        cardName: post.cardName,
        price: post.price,
        condition: post.condition || 'Near Mint',
        postType: post.postType,
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');
        try {
            const res = await updatePost(post._id, formData);
            onUpdate(res.data); // Pass the updated post back to the parent
        } catch (err) {
            setError('Failed to update post. Please try again.');
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
                <h2 className="text-2xl font-bold mb-6">Edit Post</h2>
                <form onSubmit={handleSubmit}>
                    {/* Card Name Field */}
                    <div className="mb-4">
                        <label htmlFor="cardName" className="block text-sm font-medium text-gray-700">Card Name</label>
                        <input type="text" name="cardName" id="cardName" value={formData.cardName} onChange={handleChange} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                    </div>
                    {/* Price Field */}
                    <div className="mb-4">
                        <label htmlFor="price" className="block text-sm font-medium text-gray-700">Price (₪)</label>
                        <input type="number" name="price" id="price" value={formData.price} onChange={handleChange} required min="0" step="0.01" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                    </div>
                    {/* Condition Field */}
                    <div className="mb-4">
                        <label htmlFor="condition" className="block text-sm font-medium text-gray-700">Condition</label>
                        <select name="condition" id="condition" value={formData.condition} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                            <option>Mint</option>
                            <option>Near Mint</option>
                            <option>Lightly Played</option>
                            <option>Moderately Played</option>
                            <option>Heavily Played</option>
                            <option>Damaged</option>
                        </select>
                    </div>
                     {/* Post Type Field */}
                    <div className="mb-4">
                        <label htmlFor="postType" className="block text-sm font-medium text-gray-700">Post Type</label>
                        <select name="postType" id="postType" value={formData.postType} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                           <option value="sell">Sell</option>
                           <option value="buy">Buy</option>
                        </select>
                    </div>

                    {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
                    <div className="flex justify-end gap-4">
                        <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancel</button>
                        <button type="submit" disabled={isSubmitting} className="py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-300">
                            {isSubmitting ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditPostModal;

