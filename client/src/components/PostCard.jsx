import React from 'react';
import { Tag, MapPin, BadgeDollarSign } from 'lucide-react';

const PostCard = ({ post }) => {
  const cardColor = post.postType === 'sell' ? 'border-blue-500' : 'border-green-500';
  const postTypeLabel = post.postType.charAt(0).toUpperCase() + post.postType.slice(1);
  
  return (
    <div className={`card bg-base-100 shadow-xl transition-transform hover:scale-105 border-t-4 ${cardColor}`}>
      <figure className="px-4 pt-4">
        <img src={post.cardImageUrl || 'https://placehold.co/243x353?text=Yu-Gi-Oh!'} alt={post.cardName} className="rounded-xl object-cover h-56 w-full" />
      </figure>
      <div className="card-body p-4">
        <h2 className="card-title text-lg truncate" title={post.cardName}>
          {post.cardName}
        </h2>
        <div className="flex items-center justify-between text-sm text-gray-500">
            <span className={`badge ${post.postType === 'sell' ? 'badge-info' : 'badge-success'}`}>{postTypeLabel}</span>
            <span className="flex items-center"><Tag size={14} className="mr-1" />{post.condition}</span>
        </div>
        <p className="text-xl font-bold my-2 flex items-center">
            <BadgeDollarSign size={20} className="mr-2" />
            ${post.price}
            {post.isApiPrice && <span className="badge badge-outline badge-xs ml-2">Market</span>}
        </p>
        <div className="card-actions justify-between items-center mt-2">
            <div className="flex items-center text-xs">
                <img src={post.user?.photoURL || `https://ui-avatars.com/api/?name=${post.user?.displayName}`} className="w-6 h-6 rounded-full mr-2" />
                <span>{post.user?.displayName || 'Anonymous'}</span>
            </div>
            <button className="btn btn-primary btn-sm">Contact</button>
        </div>
      </div>
    </div>
  );
};

export default PostCard;
