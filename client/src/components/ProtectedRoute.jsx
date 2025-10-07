import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogIn } from 'lucide-react';


const ProtectedRoute = ({ children }) => {
  const { currentUser, loginWithGoogle } = useAuth();

  if (!currentUser) {
    return (
      <div className="text-center p-10 bg-base-100 rounded-lg shadow-xl">
        <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
        <p className="mb-6">You must be logged in to view this page.</p>
        <button onClick={loginWithGoogle} className="btn btn-primary">
          <LogIn size={16} className="mr-2" /> Login with Google
        </button>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
