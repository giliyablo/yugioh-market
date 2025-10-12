import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getMyPosts, updatePost, deletePost } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import EditPostModal from '../components/EditPostModal';
import { Info } from 'lucide-react';
import './HomePage.css'; // Re-use the same CSS file for a consistent look

const MyPostsPage = () => {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [editingPost, setEditingPost] = useState(null);
    const [sortBy, setSortBy] = useState('createdAt');
    const [sortDir, setSortDir] = useState('desc');

    useEffect(() => {
        const fetchMyPosts = async () => {
            try {
                const res = await getMyPosts();
                setPosts(res.data);
            } catch (err) {
                setError('Failed to fetch your posts.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchMyPosts();
    }, []);

    const handlePostUpdate = (updatedPost) => {
        setPosts(posts.map(p => p._id === updatedPost._id ? updatedPost : p));
        setEditingPost(null);
    };

    const handleDelete = async (postId) => {
        if (window.confirm('Are you sure you want to permanently delete this post?')) {
            try {
                await deletePost(postId);
                setPosts(posts.filter(p => p._id !== postId));
            } catch (e) {
                console.error(e);
                alert('Failed to delete post.');
            }
        }
    };

    const togglePostStatus = async (post) => {
        const newStatus = !post.isActive;
        const action = newStatus ? 're-list' : 'complete';
        if (window.confirm(`Are you sure you want to ${action} this post?`)) {
            try {
                const { data } = await updatePost(post._id, { isActive: newStatus });
                handlePostUpdate(data);
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
    };

    const sortedPosts = useMemo(() => {
        if (!sortBy) return posts;
        return [...posts].sort((a, b) => {
            const getField = (obj, path) => path.split('.').reduce((o, i) => (o ? o[i] : undefined), obj);
            
            const valA = getField(a, sortBy);
            const valB = getField(b, sortBy);

            if (valA === valB) return 0;
            if (valA === null || valA === undefined) return 1;
            if (valB === null || valB === undefined) return -1;

            if (typeof valA === 'string' && typeof valB === 'string') {
                return sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            }
            return sortDir === 'asc' ? valA - valB : valB - valA;
        });
    }, [posts, sortBy, sortDir]);

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

    if (loading) return <div className="loading-container"><LoadingSpinner /></div>;
    if (error) return <div className="error-container">{error}</div>;

    return (
        <div className="home-page">
            {editingPost && (
                <EditPostModal
                    key={editingPost._id}
                    post={editingPost}
                    onClose={() => setEditingPost(null)}
                    onUpdate={handlePostUpdate}
                />
            )}
            <div className="page-header">
                <h1 className="page-title">My Posts</h1>
                <Link to="/" className="btn btn--secondary">
                    ← Back to All Posts
                </Link>
            </div>
            <div className="table-container">
                <table className="posts-table">
                    <thead>
                        <tr>
                            <th>Status</th>
                            <th><SortHeader label="Card" column="cardName" /></th>
                            <th><SortHeader label="Name" column="cardName" /></th>
                            <th><SortHeader label="Type" column="postType" /></th>
                            <th><SortHeader label="Price" column="price" /></th>
                            <th><SortHeader label="Condition" column="condition" /></th>
                            <th><SortHeader label="Created" column="createdAt" /></th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedPosts.length > 0 ? (
                            sortedPosts.map((post) => (
                                <tr key={post._id} className={!post.isActive ? 'is-inactive' : ''}>
                                    <td>
                                        {post.isActive ? (
                                            <span className="status-badge status-badge--active">Active</span>
                                        ) : (
                                            <span className="status-badge status-badge--completed">Completed</span>
                                        )}
                                    </td>
                                    <td className="table-cell-image">
                                        <img
                                            src={post.cardImageUrl || 'https://placehold.co/5000x116?text=No+Image'}
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
                                    <td>{post.createdAt ? new Date(post.createdAt).toLocaleDateString() : '-'}</td>
                                    <td>
                                        <div className="actions-cell">
                                            <button className="btn btn--secondary" onClick={() => setEditingPost(post)}>Edit</button>
                                            <button
                                                className={`btn ${post.isActive ? 'btn--success' : 'btn--info'}`}
                                                onClick={() => togglePostStatus(post)}
                                            >
                                                {post.isActive ? 'Complete' : 'Re-list'}
                                            </button>
                                            <button className="btn btn--danger" onClick={() => handleDelete(post._id)}>Delete</button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="8" className="table-cell-empty">You have not created any posts yet.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default MyPostsPage;