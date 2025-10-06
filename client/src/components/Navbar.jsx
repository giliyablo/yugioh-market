import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, LogOut, PlusCircle, User, List } from 'lucide-react';
import yuGiOhLogo from '../assets/yugioh_logo.png'; // Assume you have a logo image in src/assets

const Navbar = () => {
  const { currentUser, loginWithGoogle, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [cardQuery, setCardQuery] = useState(searchParams.get('q') || '');
  const [userQuery, setUserQuery] = useState(searchParams.get('user') || '');
  const [sort, setSort] = useState(searchParams.get('sort') || 'latest');

  const handleCreatePost = () => {
    document.getElementById('create_post_modal').showModal();
  };

  const applyFilters = (e) => {
    e.preventDefault();
    const params = new URLSearchParams(window.location.search);
    if (cardQuery) params.set('q', cardQuery); else params.delete('q');
    if (userQuery) params.set('user', userQuery); else params.delete('user');
    if (sort) params.set('sort', sort); else params.delete('sort');
    params.delete('page'); // reset pagination when filters change
    navigate({ pathname: '/', search: params.toString() });
  };

  return (
    <div className="navbar bg-base-100 shadow-md sticky top-0 z-50">
      <div className="navbar-start">
        <Link to="/" className="btn btn-ghost text-xl">
          <img src="https://upload.wikimedia.org/wikipedia/commons/1/11/Yu-Gi-Oh%21_Logo.svg" alt="Logo" className="h-8 mr-2"/>
          Market IL
        </Link>
      </div>
      <div className="navbar-center w-full max-w-4xl">
        <form onSubmit={applyFilters} className="flex items-center gap-2 w-full">
          <input
            type="text"
            placeholder="Search by card name"
            className="input input-bordered input-sm w-full"
            value={cardQuery}
            onChange={(e) => setCardQuery(e.target.value)}
          />
          <input
            type="text"
            placeholder="Search by user"
            className="input input-bordered input-sm w-48"
            value={userQuery}
            onChange={(e) => setUserQuery(e.target.value)}
          />
          <select
            className="select select-bordered select-sm"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="latest">Latest</option>
            <option value="cheapest">Cheapest</option>
            <option value="alpha">A → Z</option>
          </select>
          <button className="btn btn-primary btn-sm" type="submit">Search</button>
        </form>
      </div>
      <div className="navbar-end">
        {currentUser ? (
          <>
            <button className="btn btn-primary btn-sm mr-2" onClick={handleCreatePost}>
              <PlusCircle size={16} /> New Post
            </button>
            <div className="dropdown dropdown-end">
              <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar">
                <div className="w-10 rounded-full">
                  <img alt="User Avatar" src={currentUser.photoURL || `https://ui-avatars.com/api/?name=${currentUser.displayName}&background=random`} />
                </div>
              </div>
              <ul tabIndex={0} className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52">
                <li><p className="font-bold">{currentUser.displayName}</p></li>
                <li><Link to="/my-posts"><List size={16} /> My Posts</Link></li>
                <li><a onClick={logout}><LogOut size={16} /> Logout</a></li>
              </ul>
            </div>
          </>
        ) : (
          <button className="btn btn-ghost" onClick={loginWithGoogle}>
            <LogIn size={16} /> Login
          </button>
        )}
      </div>
    </div>
  );
};

export default Navbar;
