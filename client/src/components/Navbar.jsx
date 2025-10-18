import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, LogOut, PlusCircle, List, Search, Menu, X } from 'lucide-react';
import './Navbar.css';
import '../pages/HomePage.css';
import { Shield } from 'lucide-react';

const Navbar = ({ onOpenCreateModal }) => {
    const { currentUser, loginWithGoogle, logout, isAdmin } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [cardQuery, setCardQuery] = useState(searchParams.get('q') || '');
    const [userQuery, setUserQuery] = useState(searchParams.get('user') || '');
    const [sort, setSort] = useState(searchParams.get('sort') || 'latest');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const handleCreatePost = () => {
        if (!currentUser) {
            loginWithGoogle();
        } else {
            onOpenCreateModal();
        }
    };

    const applyFilters = (e) => {
        e.preventDefault();
        const params = new URLSearchParams(window.location.search);
        if (cardQuery) params.set('q', cardQuery); else params.delete('q');
        if (userQuery) params.set('user', userQuery); else params.delete('user');
        if (sort) params.set('sort', sort); else params.delete('sort');
        params.delete('page');
        navigate({ pathname: '/', search: params.toString() });
        setIsMobileMenuOpen(false);
    };

    return (
        <nav className={`navbar ${isMobileMenuOpen ? 'is-open' : ''}`}>
            <div className="navbar__left">
                <Link to="/" className="navbar__logo">
                    <img src="https://drive.google.com/uc?export=view&id=1b9JBroM6JtdijY9UrMQOEbmmQaLTkTq_" alt="Logo" className="navbar__logo-img" />
                    Market IL
                </Link>
                <button
                    type="button"
                    className="navbar__menu-toggle"
                    aria-label="Toggle menu"
                    onClick={() => setIsMobileMenuOpen(prev => !prev)}
                >
                    {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
                </button>
            </div>

            <div className="navbar__center">
                <form onSubmit={applyFilters} className="search-form">
                    <input
                        type="text"
                        placeholder="Search by card name..."
                        className="form-input form-input--sm"
                        value={cardQuery}
                        onChange={(e) => setCardQuery(e.target.value)}
                    />
                    <input
                        type="text"
                        placeholder="Search by user..."
                        className="form-input form-input--sm"
                        value={userQuery}
                        onChange={(e) => setUserQuery(e.target.value)}
                    />
                    <select
                        className="form-input form-input--sm"
                        value={sort}
                        onChange={(e) => setSort(e.target.value)}
                    >
                        <option value="latest">Latest</option>
                        <option value="cheapest">Cheapest</option>
                        <option value="alpha">A → Z</option>
                    </select>
                    <button className="btn btn--primary" type="submit">
                        <Search size={16} />
                    </button>
                </form>
            </div>

            <div className="navbar__right">
                {currentUser ? (
                    <>
                        <button className="btn btn--primary" onClick={handleCreatePost}>
                           <span className="btn__content"><PlusCircle size={16} /> New Post</span>
                        </button>
                        <div className="user-dropdown">
                            <button className="user-dropdown__trigger">
                                <img
                                    alt="User Avatar"
                                    src={currentUser.photoURL || `https://ui-avatars.com/api/?name=${currentUser.displayName}&background=0D8ABC&color=fff`}
                                />
                            </button>
                            <div className="user-dropdown__menu">
                                <div className="user-dropdown__header">
                                    <strong>{currentUser.displayName}</strong>
                                    <small>{currentUser.email}</small>
                                </div>
                                <div className="user-dropdown__divider"></div>
                                <Link to="/my-posts" className="user-dropdown__item">
                                    <List size={16} /> My Posts
                                </Link>
                                {isAdmin && (
                                    <Link to="/admin" className="user-dropdown__item">
                                        <Shield size={16} /> Admin Panel
                                    </Link>
                                )}
                                <a onClick={logout} className="user-dropdown__item user-dropdown__item--danger">
                                    <LogOut size={16} /> Logout
                                </a>
                            </div>
                        </div>
                    </>
                ) : (
                    <button className="btn btn--primary" onClick={loginWithGoogle}>
                        <span className="btn__content"><LogIn size={16} /> Login</span>
                    </button>
                )}
            </div>
        </nav>
    );
};

export default Navbar;