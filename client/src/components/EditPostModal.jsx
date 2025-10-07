import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { updatePost } from '../services/api';

const EditPostModal = ({ post, onClose, onUpdate }) => {
  const { currentUser } = useAuth();
  const [formData, setFormData] = useState(post);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Keep form synced with selected post
  useEffect(() => {
    setFormData(post);
  }, [post]);

  // 🔥 Auto-open modal when rendered
  useEffect(() => {
    const modal = document.getElementById('edit_post_modal');
    if (modal) modal.showModal();
  }, []);

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

      const modal = document.getElementById('edit_post_modal');
      if (modal) modal.close();
      onClose();
    } catch (err) {
      setError('Failed to update post.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <dialog id="edit_post_modal" className="modal">
      <div className="modal-box">
        <form method="dialog">
          <button
            type="button"
            className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
            onClick={onClose}
          >
            ✕
          </button>
        </form>

        <h3 className="font-bold text-lg">Edit Post</h3>

        <form onSubmit={handleSubmit} className="py-4 space-y-4">
          <input
            type="text"
            name="cardName"
            placeholder="Card Name (e.g., Blue-Eyes White Dragon)"
            className="input input-bordered w-full"
            value={formData.cardName || ''}
            onChange={handleChange}
            required
          />

          <select
            name="postType"
            className="select select-bordered w-full"
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
            className="input input-bordered w-full"
            value={formData.price || ''}
            onChange={handleChange}
          />

          <select
            name="condition"
            className="select select-bordered w-full"
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
            className="input input-bordered w-full"
            value={formData.cardImageUrl || ''}
            onChange={handleChange}
          />

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div className="modal-action">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="loading loading-spinner"></span> : 'Update Post'}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
};

export default EditPostModal;
