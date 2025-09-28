import React from 'react';
import { Link } from 'react-router-dom';

const NotFoundPage = () => {
  return (
    <div className="text-center py-20">
      <h1 className="text-6xl font-bold">404</h1>
      <p className="text-xl mt-4 mb-8">Oops! Page not found.</p>
      <Link to="/" className="btn btn-primary">Go back to Home</Link>
    </div>
  );
};

export default NotFoundPage;
