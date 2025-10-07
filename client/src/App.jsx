import React, { useState } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import MyPostsPage from './pages/MyPostsPage';
import NotFoundPage from './pages/NotFoundPage';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  // State to manage the create post modal's visibility
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  return (
    <AuthProvider>
      <Router>
        {/* Pass the function to open the modal to the Navbar */}
        <Navbar onOpenCreateModal={() => setIsCreateModalOpen(true)} />
        <main>
          <Routes>
            <Route 
              path="/" 
              element={
                <HomePage 
                  isCreateModalOpen={isCreateModalOpen}
                  onCloseCreateModal={() => setIsCreateModalOpen(false)}
                />
              } 
            />
            <Route 
              path="/my-posts" 
              element={
                <ProtectedRoute>
                  <MyPostsPage />
                </ProtectedRoute>
              } 
            />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>
      </Router>
    </AuthProvider>
  );
}

export default App;