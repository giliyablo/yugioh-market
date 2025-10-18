import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import './setupTests';

// Mock the entire firebase/auth module for authentication control
vi.mock('firebase/auth', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getAuth: vi.fn(),
    onAuthStateChanged: vi.fn((auth, callback) => {
      callback({ uid: 'test-user-123', email: 'test@example.com' });
      return () => {};
    }),
    GoogleAuthProvider: vi.fn(),
  };
});

// Mock the entire firebase/firestore module to prevent database calls
vi.mock('firebase/firestore', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getFirestore: vi.fn(() => ({})),
    doc: vi.fn(() => ({})),
    getDoc: vi.fn(() => Promise.resolve({ exists: () => false })),
    collection: vi.fn(() => ({})),
    query: vi.fn(() => ({})),
    where: vi.fn(() => ({})),
    onSnapshot: vi.fn(() => () => {}),
    orderBy: vi.fn(() => ({})),
    limit: vi.fn(() => ({})),
  };
});


describe('App component', () => {
  it('renders the home page with the title "Posts" after authentication', async () => {
    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    const headingElement = await screen.findByText(/Posts/i, {}, { timeout: 3000 });

    expect(headingElement).toBeInTheDocument();
  });
});