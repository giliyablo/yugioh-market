import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ProtectedRoute from './ProtectedRoute';

const AdminRoute = ({ children }) => {
    const { isAdmin } = useAuth();

    if (!isAdmin) {
        return (
            <div className="access-denied-container">
                <h2 className="access-denied-title">Access Denied</h2>
                <p className="access-denied-text">You do not have permission to view this page.</p>
            </div>
        );
    }

    return children;
};

// This component composes both protections
const ProtectedAdminRoute = ({ children }) => (
    <ProtectedRoute>
        <AdminRoute>
            {children}
        </AdminRoute>
    </ProtectedRoute>
);

export default ProtectedAdminRoute;