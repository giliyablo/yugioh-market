// client/src/components/Login.js
import React from 'react';
import { auth, googleProvider } from '../firebase';
import { signInWithPopup } from 'firebase/auth';

const Login = () => {
    const signInWithGoogle = async () => {
        try {
            const result = await signInWithPopup(auth, googleProvider);
            // After successful login, you get a token.
            // You should send this token to your backend to create a user record in your DB.
            const idToken = await result.user.getIdToken();
            // Example: await axios.post('/api/auth/verify', { token: idToken });
            console.log("Logged in user:", result.user);
        } catch (error) {
            console.error("Error during Google sign-in:", error);
        }
    };

    return (
        <div>
            <h2>Please Sign In</h2>
            <p>You need to be logged in to create posts or make deals.</p>
            <button onClick={signInWithGoogle}>Sign in with Google</button>
            {/* Add buttons for Facebook and Phone Number */}
        </div>
    );
};

export default Login;