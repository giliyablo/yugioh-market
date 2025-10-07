import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getPosts, updatePost, deletePost } from '../services/api';
import { useAuth } from '../context/AuthContext';
import CreatePostModal from '../components/CreatePostModal';
import EditPostModal from '../components/EditPostModal';
import LoadingSpinner from '../components/LoadingSpinner';
import { Info } from 'lucide-react';
import './HomePage.css'; // Import the new custom CSS

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
    const [editingPost, setEditingPost] = useState(null);

    useEffect(() => {
        const fetchPosts = async () => {
            setLoading(true);
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
        setPosts(prevPosts => [newPost, ...prevPosts]);
    };

    const handlePostUpdate = (updatedPost) => {
        if (!updatedPost.isActive) {
            setPosts(posts.filter(p => p._id !== updatedPost._id));
        } else {
            setPosts(posts.map(p => p._id === updatedPost._id ? updatedPost : p));
        }
        setEditingPost(null);
    };

    const handleDelete = async (postId) => {
        if (window.confirm('Are you sure you want to delete this post?')) {
            try {
                await deletePost(postId);
                setPosts(posts.filter(p => p._id !== postId));
            } catch (e) {
                console.error(e);
                alert('Failed to delete post.');
            }
        }
    };

    const handleCompletePost = async (post) => {
        if (window.confirm('Mark this post as completed? It will be removed from the main list.')) {
            try {
                await updatePost(post._id, { isActive: false });
                setPosts(posts.filter(p => p._id !== post._id));
            } catch (e) {
                console.error(e);
                alert('Failed to update post status.');
            }
        }
    };

    const cycleSort = (column) => {
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
            <button className="sort-header" onClick={() => cycleSort(column)}>
                {label} <span className="sort-icon">{icon}</span>
            </button>
        );
    };

    if (loading) {
        return <div className="loading-container"><LoadingSpinner /></div>;
    }
    
    if (error) {
        return <div className="error-container">{error}</div>;
    }

    return (
        <div className="home-page">
            <h1 className="page-title">Posts</h1>
            <div className="table-container">
                <table className="posts-table">
                    <thead>
                        <tr>
                            <th><SortHeader label="Card" column="cardName" /></th>
                            <th><SortHeader label="Name" column="cardName" /></th>
                            <th><SortHeader label="Type" column="postType" /></th>
                            <th><SortHeader label="Price" column="price" /></th>
                            <th><SortHeader label="Condition" column="condition" /></th>
                            <th><SortHeader label="User" column="user.displayName" /></th>
                            <th><SortHeader label="Contact" column="user.contact.phoneNumber" /></th>
                            <th><SortHeader label="Created" column="createdAt" /></th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {posts.length > 0 ? (
                            posts.map((post) => (
                                <tr key={post._id}>
                                    <td className="table-cell-image">
                                        <img
                                            src={post.cardImageUrl || 'https://placehold.co/80x116?text=No+Image'}
                                            alt={post.cardName}
                                            loading="lazy"
                                        />
                                    </td>
                                    <td>{post.cardName}</td>
                                    <td className="capitalize">{post.postType}</td>
                                    <td>
                                        <div className="price-cell">
                                            <span>{post.price !== undefined && post.price !== null ? `$${Number(post.price).toFixed(2)}` : '-'}</span>
                                            {post.isApiPrice && (
                                                <div className="tooltip" title="Price from TCGplayer (Market)">
                                                    <Info size={16} />
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td>{post.condition}</td>
                                    <td>{post.user?.displayName || '-'}</td>
                                    <td>{post.user?.contact?.phoneNumber || post.user?.contact?.email || '-'}</td>
                                    <td>{post.createdAt ? new Date(post.createdAt).toLocaleDateString() : '-'}</td>
                                    <td>
                                        <div className="actions-cell">
                                            {currentUser && post.user?.uid === currentUser.uid ? (
                                                <>
                                                    <button className="btn btn--secondary" onClick={() => setEditingPost(post)}>Edit</button>
                                                    <button className="btn btn--success" onClick={() => handleCompletePost(post)}>Complete</button>
                                                    <button className="btn btn--danger" onClick={() => handleDelete(post._id)}>Delete</button>
                                                </>
                                            ) : currentUser ? (
                                                <button className="btn btn--primary">Contact</button>
                                            ) : null}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={9} className="table-cell-empty">No posts found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="pagination-controls">
                <div className="pagination-buttons">
                    <button className="btn" disabled={page <= 1} onClick={() => {
                        const params = new URLSearchParams(window.location.search);
                        params.set('page', String(page - 1));
                        navigate({ search: params.toString() });
                    }}>Prev</button>
                    <button className="btn" disabled={page >= totalPages} onClick={() => {
                        const params = new URLSearchParams(window.location.search);
                        params.set('page', String(page + 1));
                        navigate({ search: params.toString() });
                    }}>Next</button>
                </div>
                <div className="pagination-info">
                    <span>Rows:</span>
                    <select className="select-rows" value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                    </select>
                    <span>Page {page} of {totalPages}</span>
                </div>
            </div>
            
            <CreatePostModal onPostCreated={handlePostCreated} />
            {editingPost && (
                <EditPostModal
                    key={editingPost._id}
                    post={editingPost}
                    onClose={() => setEditingPost(null)}
                    onUpdate={handlePostUpdate}
                />
            )}
        </div>
    );
};

export default HomePage;