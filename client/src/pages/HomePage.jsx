import React, { useState, useEffect } from 'react';
import { getPosts } from '../services/api';
import PostCard from '../components/PostCard';
import CreatePostModal from '../components/CreatePostModal';
import LoadingSpinner from '../components/LoadingSpinner';

const HomePage = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const res = await getPosts();
        setPosts(res.data);
      } catch (err) {
        setError('Failed to fetch posts. The server might be down.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, []);

  const handlePostCreated = (newPost) => {
    setPosts([newPost, ...posts]);
  };

  if (loading) {
    return <div className="flex justify-center mt-20"><LoadingSpinner /></div>;
  }
  
  if (error) {
    return <div className="text-center text-red-500 mt-20">{error}</div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Latest Posts in Ashdod</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {posts.length > 0 ? (
          posts.map(post => <PostCard key={post._id} post={post} />)
        ) : (
          <p>No posts found. Be the first to create one!</p>
        )}
      </div>
      <CreatePostModal onPostCreated={handlePostCreated} />
    </div>
  );
};

export default HomePage;
