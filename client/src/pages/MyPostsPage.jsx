import React from 'react';
import { useAuth } from '../context/AuthContext';

// This is a placeholder for now.
// You would fetch posts filtered by the current user's UID.
const MyPostsPage = () => {
  const { currentUser } = useAuth();

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">My Posts</h1>
      <p>Welcome, {currentUser.displayName}! This page will display all the cards you have listed for buying or selling.</p>
      {/* TODO: Fetch and display posts where post.user.uid === currentUser.uid */}
      <div className="mt-8 p-6 bg-base-100 rounded-box text-center">
        <p className="text-lg">Feature coming soon!</p>
      </div>
    </div>
  );
};

export default MyPostsPage;
