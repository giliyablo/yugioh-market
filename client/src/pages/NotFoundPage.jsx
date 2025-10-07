import React from 'react';
import { Link } from 'react-router-dom';
import './HomePage.css'; // Re-use the same CSS file for a consistent look

const NotFoundPage = () => {
  return (
    <div className="not-found-container">
      <h1 className="not-found-title">404</h1>
      <p className="not-found-text">Oops! The page you're looking for does not exist.</p>
      <Link to="/" className="btn btn--primary">
        Go back to Home
      </Link>
    </div>
  );
};

export default NotFoundPage;