import React from 'react';

const LoadingSpinner = () => {
  // We use a div here instead of a span for better block-level behavior,
  // but a span would also work.
  return <div className="loading-spinner"></div>;
};

export default LoadingSpinner;