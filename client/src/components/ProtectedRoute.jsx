import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogIn } from 'lucide-react';
import '../pages/HomePage.css'; // Import main styles

const ProtectedRoute = ({ children }) => {
  const { currentUser, loginWithGoogle } = useAuth();

  if (!currentUser) {
    return (
      <div className="access-denied-container">
        <h2 className="access-denied-title">Access Denied</h2>
        <p className="access-denied-text">You must be logged in to view this page.</p>
        <button onClick={loginWithGoogle} className="btn btn--primary">
          <span className="btn__content">
            <LogIn size={16} />
            Login with Google
          </span>
        </button>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;