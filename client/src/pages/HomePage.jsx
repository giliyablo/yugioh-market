import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getPosts, updatePost, deletePost } from '../services/api';
import { useAuth } from '../context/AuthContext';
import CreatePostModal from '../components/CreatePostModal';
import LoadingSpinner from '../components/LoadingSpinner';

const HomePage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || '');
  const [sortDir, setSortDir] = useState(searchParams.get('sortDir') || '');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const { currentUser } = useAuth();

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const params = Object.fromEntries(searchParams.entries());
        const res = await getPosts({
          ...params,
          sortBy: params.sortBy || sortBy || undefined,
          sortDir: params.sortDir || sortDir || undefined,
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
  }, [searchParams, limit, sortBy, sortDir]);

  const handlePostCreated = (newPost) => {
    setPosts([newPost, ...posts]);
  };

  if (loading) {
    return <div className="flex justify-center mt-20"><LoadingSpinner /></div>;
  }
  
  if (error) {
    return <div className="text-center text-red-500 mt-20">{error}</div>;
  }

  const cycleSort = (column) => {
    // cycles: none -> asc -> desc -> none
    let nextBy = sortBy;
    let nextDir = sortDir;
    if (sortBy !== column) {
      nextBy = column; nextDir = 'asc';
    } else if (sortDir === 'asc') {
      nextDir = 'desc';
    } else if (sortDir === 'desc') {
      nextBy = ''; nextDir = '';
    } else {
      nextDir = 'asc';
    }

    setSortBy(nextBy);
    setSortDir(nextDir);
    const params = new URLSearchParams(window.location.search);
    if (nextBy) params.set('sortBy', nextBy); else params.delete('sortBy');
    if (nextDir) params.set('sortDir', nextDir); else params.delete('sortDir');
    params.delete('page');
    navigate({ pathname: '/', search: params.toString() });
  };

  const SortHeader = ({ label, column }) => {
    const active = sortBy === column;
    const dir = active ? sortDir : '';
    const icon = dir === 'asc' ? '▲' : dir === 'desc' ? '▼' : '↕';
    return (
      <button className="btn btn-ghost btn-xs" onClick={() => cycleSort(column)}>
        {label} {icon}
      </button>
    );
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Posts</h1>
      <div className="overflow-x-auto bg-base-100 rounded-box shadow">
        <table className="table table-zebra">
          <thead>
            <tr>
              <th><SortHeader label="Card" column="cardImageUrl" /></th>
              <th><SortHeader label="Name" column="cardName" /></th>
              <th><SortHeader label="Type" column="postType" /></th>
              <th><SortHeader label="Price" column="price" /></th>
              <th><SortHeader label="Condition" column="condition" /></th>
              <th><SortHeader label="User" column="user.displayName" /></th>
              <th><SortHeader label="Phone" column="user.contact.phoneNumber" /></th>
              <th><SortHeader label="Created" column="createdAt" /></th>
              <th>Actions</th>
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
                      loading="lazy"
                      width={160}
                      height={240}
                      className="object-cover rounded"
                      style={{ width: '160px', height: '240px' }}
                    />
                  </td>
                  <td className="whitespace-pre-wrap">{post.cardName}</td>
                  <td className="capitalize">{post.postType}</td>
                  <td>{post.price !== undefined && post.price !== null ? `₪${Number(post.price).toFixed(2)}` : '-'}</td>
                  <td>{post.condition}</td>
                  <td>{post.user?.displayName || '-'}</td>
                  <td>{post.user?.contact?.phoneNumber || '-'}</td>
                  <td>{post.createdAt ? new Date(post.createdAt).toLocaleDateString() : '-'}</td>
                  <td>
                    {currentUser && post.user?.uid === currentUser.uid && (
                      <div className="flex gap-2">
                        <button className="btn btn-xs" onClick={async () => {
                          const newPrice = prompt('New price (₪):', post.price ?? '');
                          if (newPrice === null) return;
                          try {
                            const { data } = await updatePost(post._id, { price: Number(newPrice) });
                            setPosts(posts.map(p => p._id === post._id ? data : p));
                          } catch (e) { console.error(e); }
                        }}>Edit</button>
                        <button className="btn btn-xs btn-error" onClick={async () => {
                          if (!confirm('Delete this post?')) return;
                          try {
                            await deletePost(post._id);
                            setPosts(posts.filter(p => p._id !== post._id));
                          } catch (e) { console.error(e); }
                        }}>Delete</button>
                      </div>
                    )}
                  </td>
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
