import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getMyPosts, updatePost, deletePost } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import EditPostModal from '../components/EditPostModal';
import { Info } from 'lucide-react';

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
            <button className="btn btn-ghost btn-xs" onClick={() => cycleSort(column)}>
                {label} {icon}
            </button>
        );
    };

    if (loading) return <div className="flex justify-center mt-20"><LoadingSpinner /></div>;
    if (error) return <div className="text-center text-red-500 mt-20">{error}</div>;

    return (
        <div>
            {editingPost && (
                <EditPostModal
                    key={editingPost._id} // This is the fix
                    post={editingPost}
                    onClose={() => setEditingPost(null)}
                    onUpdate={handlePostUpdate}
                />
            )}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">My Posts</h1>
                <Link to="/" className="btn btn-outline">
                    ← Back to All Posts
                </Link>
            </div>
            <div className="overflow-x-auto bg-base-100 rounded-box shadow">
                <table className="table table-zebra w-full">
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
                                <tr key={post._id} className={!post.isActive ? 'opacity-50' : ''}>
                                    <td>
                                        {post.isActive ? (
                                            <span className="badge badge-success">Active</span>
                                        ) : (
                                            <span className="badge badge-ghost">Completed</span>
                                        )}
                                    </td>
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
                                    <td className="whitespace-pre-wrap font-semibold">{post.cardName}</td>
                                    <td className="capitalize">{post.postType}</td>
                                    <td>
                                        <div className="flex items-center gap-1">
                                            <span>{post.price !== undefined && post.price !== null ? `$${Number(post.price).toFixed(2)}` : '-'}</span>
                                            {post.isApiPrice && (
                                                <div className="tooltip" data-tip="Price from TCGplayer (Market)">
                                                    <Info size={16} className="text-info" />
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td>{post.condition}</td>
                                    <td>{post.createdAt ? new Date(post.createdAt).toLocaleDateString() : '-'}</td>
                                    <td>
                                        <div className="flex flex-col gap-2">
                                            <button className="btn btn-xs btn-outline" onClick={() => setEditingPost(post)}>Edit</button>
                                            <button
                                                className={`btn btn-xs btn-outline ${post.isActive ? 'btn-success' : 'btn-info'}`}
                                                onClick={() => togglePostStatus(post)}
                                            >
                                                {post.isActive ? 'Complete' : 'Re-list'}
                                            </button>
                                            <button className="btn btn-xs btn-outline btn-error" onClick={() => handleDelete(post._id)}>Delete</button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="8" className="text-center py-10">You have not created any posts yet.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default MyPostsPage;

