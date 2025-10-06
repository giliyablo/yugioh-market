import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getPosts } from '../services/api';
import CreatePostModal from '../components/CreatePostModal';
import LoadingSpinner from '../components/LoadingSpinner';

const HomePage = () => {
  const [searchParams] = useSearchParams();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const params = Object.fromEntries(searchParams.entries());
        const res = await getPosts({
          ...params,
          page: params.page ? Number(params.page) : 1,
          limit
        });
        const data = res.data;
        setPosts(data.items || []);
        setPage(data.page || 1);
        setTotalPages(data.totalPages || 1);
      } catch (err) {
        setError('Failed to fetch posts. The server might be down.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, [searchParams, limit]);

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
      <h1 className="text-3xl font-bold mb-6">Posts</h1>
      <div className="overflow-x-auto bg-base-100 rounded-box shadow">
        <table className="table table-zebra">
          <thead>
            <tr>
              <th>Card</th>
              <th>Name</th>
              <th>Type</th>
              <th>Price</th>
              <th>Condition</th>
              <th>User</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {posts.length > 0 ? (
              posts.map((post) => (
                <tr key={post._id}>
                  <td>
                    <img
                      src={post.cardImageUrl || 'https://placehold.co/80x116?text=No+Image'}
                      alt={post.cardName}
                      className="w-12 h-16 object-cover rounded"
                    />
                  </td>
                  <td className="whitespace-pre-wrap">{post.cardName}</td>
                  <td className="capitalize">{post.postType}</td>
                  <td>{post.price !== undefined && post.price !== null ? `₪${Number(post.price).toFixed(2)}` : '-'}</td>
                  <td>{post.condition}</td>
                  <td>{post.user?.displayName || '-'}</td>
                  <td>{post.createdAt ? new Date(post.createdAt).toLocaleDateString() : '-'}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="text-center py-10">No posts found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-4">
        <div className="join">
          <button className="btn join-item" disabled={page <= 1} onClick={() => {
            const params = new URLSearchParams(window.location.search);
            params.set('page', String(page - 1));
            window.history.pushState({}, '', `/?${params.toString()}`);
            window.dispatchEvent(new PopStateEvent('popstate'));
          }}>Prev</button>
          <button className="btn join-item" disabled={page >= totalPages} onClick={() => {
            const params = new URLSearchParams(window.location.search);
            params.set('page', String(page + 1));
            window.history.pushState({}, '', `/?${params.toString()}`);
            window.dispatchEvent(new PopStateEvent('popstate'));
          }}>Next</button>
        </div>
        <div className="flex items-center gap-2">
          <span>Rows:</span>
          <select className="select select-bordered select-sm" value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
          <span>Page {page} of {totalPages}</span>
        </div>
      </div>
      <CreatePostModal onPostCreated={handlePostCreated} />
    </div>
  );
};

export default HomePage;
