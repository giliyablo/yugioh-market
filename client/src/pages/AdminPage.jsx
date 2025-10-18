import React from 'react';
import AdminBulkAdd from '../components/AdminBulkAdd';
import './HomePage.css';

const AdminPage = () => {
    return (
        <div className="home-page">
            <h1 className="page-title">Admin Panel</h1>
            <AdminBulkAdd />
        </div>
    );
};

export default AdminPage;