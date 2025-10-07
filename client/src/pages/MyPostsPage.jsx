import React, { useState, useEffect } from 'react';
import { getMyPosts, updatePost, deletePost } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import EditPostModal from '../components/EditPostModal';

const MyPostsPage = () => {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [editingPost, setEditingPost] = useState(null);

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

    if (loading) return <div className="flex justify-center mt-20"><LoadingSpinner /></div>;
    if (error) return <div className="text-center text-red-500 mt-20">{error}</div>;

    return (
        <div>
            {editingPost && (
                <EditPostModal
                    post={editingPost}
                    onClose={() => setEditingPost(null)}
                    onUpdate={handlePostUpdate}
                />
            )}
            <h1 className="text-3xl font-bold mb-6">My Posts</h1>
            <div className="overflow-x-auto bg-base-100 rounded-box shadow">
                <table className="table w-full">
                    <thead>
                        <tr>
                            <th>Status</th>
                            <th>Card</th>
                            <th>Name</th>
                            <th>Type</th>
                            <th>Price</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {posts.length > 0 ? (
                            posts.map((post) => (
                                <tr key={post._id} className={!post.isActive ? 'opacity-50' : ''}>
                                    <td>
                                        {post.isActive ? (
                                            <span className="badge badge-success">Active</span>
                                        ) : (
                                            <span className="badge badge-ghost">Completed</span>
                                        )}
                                    </td>
                                    <td>
                                        <img src={post.cardImageUrl || 'https://placehold.co/80x116?text=No+Image'} alt={post.cardName} className="w-16 h-23 object-cover rounded"/>
                                    </td>
                                    <td className="font-semibold">{post.cardName}</td>
                                    <td className="capitalize">{post.postType}</td>
                                    <td>{post.price ? `₪${post.price.toFixed(2)}` : 'N/A'}</td>
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
                                <td colSpan="6" className="text-center py-10">You have not created any posts yet.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default MyPostsPage;

