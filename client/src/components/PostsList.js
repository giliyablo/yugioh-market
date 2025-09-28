// client/src/components/PostsList.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const PostsList = () => {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPosts = async () => {
            try {
                // Fetch posts from your backend API
                const response = await axios.get('http://localhost:5000/api/posts');
                setPosts(response.data);
            } catch (error) {
                console.error("Failed to fetch posts:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchPosts();
    }, []);

    if (loading) return <p>Loading cards...</p>;

    return (
        <div className="posts-container">
            {posts.map(post => (
                <div key={post.post_id} className="card-post">
                    <h3>{post.card_name}</h3>
                    <p>Type: {post.post_type}</p>
                    <p>Price: ₪{post.price}</p>
                    <p>Seller: {post.display_name}</p>
                    {/* Requirement 5: A "Contact Seller" button would appear here */}
                    {/* It would only be enabled for logged-in users and would reveal */}
                    {/* the seller's contact info after confirmation. */}
                </div>
            ))}
        </div>
    );
};

export default PostsList;