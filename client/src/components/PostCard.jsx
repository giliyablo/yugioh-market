import React from 'react';
import { Tag, BadgeDollarSign } from 'lucide-react';
import './PostCard.css'; // Import the new card-specific CSS
import '../pages/HomePage.css'; // Import main styles for buttons

const PostCard = ({ post }) => {
  // Determine the modifier class based on the post type
  const cardModifier = post.postType === 'sell' ? 'post-card--sell' : 'post-card--buy';
  const postTypeLabel = post.postType.charAt(0).toUpperCase() + post.postType.slice(1);

  return (
    <div className={`post-card ${cardModifier}`}>
      <figure className="post-card__image-container">
        <img 
            src={post.cardImageUrl || 'https://placehold.co/243x353?text=Yu-Gi-Oh!'} 
            alt={post.cardName} 
            className="post-card__image" 
        />
      </figure>
      <div className="post-card__body">
        <h2 className="post-card__title" title={post.cardName}>
          {post.cardName}
        </h2>

        <div className="post-card__meta">
          <span className={`badge ${post.postType === 'sell' ? 'badge--info' : 'badge--success'}`}>{postTypeLabel}</span>
          <span className="post-card__condition">
            <Tag size={14} />
            {post.condition}
          </span>
        </div>

        <p className="post-card__price">
          <BadgeDollarSign size={20} />
          {post.price}
          {post.isApiPrice && <span className="badge badge--outline">Market</span>}
        </p>

        <div className="post-card__actions">
          <div className="post-card__user">
            <img 
                src={post.user?.photoURL || `https://ui-avatars.com/api/?name=${post.user?.displayName}`} 
                alt={post.user?.displayName || 'User Avatar'}
                className="post-card__user-avatar" 
            />
            <span>{post.user?.displayName || 'Anonymous'}</span>
          </div>
          <button className="btn btn--primary">Contact</button>
        </div>
      </div>
    </div>
  );
};

export default PostCard;