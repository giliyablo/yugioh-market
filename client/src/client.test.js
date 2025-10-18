import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';

describe('App component', () => {
  it('renders the home page with the title "Posts"', () => {
    render(
      <AuthProvider>
        <MemoryRouter>
          <App />
        </MemoryRouter>
      </AuthProvider>
    );
    const headingElement = screen.getByText(/Posts/i);
    expect(headingElement).toBeInTheDocument();
  });
});