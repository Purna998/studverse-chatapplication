import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../utils/api";

export const Login = ({ onClose, onLoginSuccess, onSwitchToRegister }) => {
  const [formData, setFormData] = useState({
    username: "",
    password: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const { login, isAuthenticated, user, logout } = useAuth();

  // Initialize Google OAuth
  useEffect(() => {
    const initGoogleOAuth = async () => {
      try {
        // Load Google OAuth script
        if (!window.google) {
          const script = document.createElement('script');
          script.src = 'https://accounts.google.com/gsi/client';
          script.async = true;
          script.defer = true;
          document.head.appendChild(script);
        }
      } catch (error) {
        console.error('Error initializing Google OAuth:', error);
      }
    };

    initGoogleOAuth();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    console.log('Attempting login with:', formData.username);

    try {
      const data = await api.login(formData);
      console.log('Login response:', data);

      if (data.access) {
        // Login successful - store tokens in localStorage (AuthContext will copy to sessionStorage)
        localStorage.setItem('access_token', data.access);
        localStorage.setItem('refresh_token', data.refresh);
        localStorage.setItem('username', formData.username);
        
        console.log('Login response with user data:', data);
        
        // Store user data if provided
        if (data.user) {
          localStorage.setItem('user_data', JSON.stringify(data.user));
          console.log('User data stored:', data.user);
          console.log('User is_admin status:', data.user.is_admin);
          
          // Check if user is admin
          const isAdmin = data.user.is_admin === true;
          console.log('Login: User is admin:', isAdmin);
          
          if (isAdmin) {
            console.log('Login: Admin user detected, will redirect to admin dashboard');
          } else {
            console.log('Login: Regular user detected, will redirect to chat dashboard');
          }
        }
        
        console.log('Tokens stored in localStorage, updating auth context...');
        
        // Update auth context - this will now fetch user profile and check admin status
        // The login function will copy tokens to sessionStorage
        const loginData = { username: formData.username, userData: data.user };
        console.log('Login: Passing to AuthContext:', loginData);
        await login(loginData);
        
        console.log('Auth context updated, closing modal...');
        
        // Close modal and redirect (admin users will be automatically redirected to admin dashboard)
        onClose();
        if (onLoginSuccess) {
          console.log('Calling onLoginSuccess...');
          // Pass admin status so caller can decide navigation
          const isAdmin = data.user?.is_admin === true;
          onLoginSuccess({ isAdmin });
        }
      } else {
        // Login failed
        console.log('Login failed:', data.detail);
        setError(data.detail || 'Invalid username or password.');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError(error?.message || 'Network error. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setError("");

    try {
      // Initialize Google OAuth
      if (!window.google) {
        throw new Error('Google OAuth not loaded');
      }

      // Configure Google Sign-In
      google.accounts.id.initialize({
        client_id: 'YOUR_GOOGLE_CLIENT_ID', // Replace with your actual client ID
        callback: async (response) => {
          try {
            console.log('Google OAuth response received');
            
            // Send the ID token to our backend
            const data = await api.googleAuth(response.credential);
            console.log('Google auth response:', data);

            if (data.success && data.access) {
              // Store tokens
              localStorage.setItem('access_token', data.access);
              localStorage.setItem('refresh_token', data.refresh);
              localStorage.setItem('username', data.user.username);
              
              // Update auth context
              await login({ 
                username: data.user.username,
                isGoogleUser: true,
                userData: { userData: data.user }
              });
              
              // Close modal and redirect
              onClose();
              if (onLoginSuccess) {
                onLoginSuccess();
              }
            } else {
              setError(data.error || 'Google authentication failed.');
            }
          } catch (error) {
            console.error('Google auth error:', error);
            setError('Google authentication failed. Please try again.');
          } finally {
            setIsGoogleLoading(false);
          }
        },
      });

      // Prompt Google Sign-In
      google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          setError('Google Sign-In was not displayed. Please try again.');
          setIsGoogleLoading(false);
        }
      });

    } catch (error) {
      console.error('Google OAuth error:', error);
      setError('Failed to initialize Google Sign-In. Please try again.');
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex justify-center items-center bg-black/40 z-50">
      <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md relative">
        {/* Header */}
        <h3 className="text-gray-500 mb-1">Please enter your details</h3>
        <h1 className="text-2xl font-bold mb-6">Welcome</h1>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Username */}
          <input
            type="text"
            name="username"
            placeholder="Username"
            value={formData.username}
            onChange={handleInputChange}
            className="w-full border rounded-md p-3 mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
          />

          {/* Password */}
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleInputChange}
            className="w-full border rounded-md p-3 mb-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
          />

          {/* Forgot password */}
          <div className="flex justify-end mb-6">
            <a href="#" className="text-indigo-600 text-sm hover:underline">
              Forgot password?
            </a>
          </div>

          {/* Sign In Button */}
          <button 
            type="submit"
            disabled={isLoading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium py-3 rounded-md transition-colors duration-200"
          >
            {isLoading ? "Signing In..." : "Sign In"}
          </button>
        </form>

        {/* OR */}
        <div className="flex items-center my-6">
          <hr className="flex-grow border-gray-300" />
          <span className="mx-3 text-gray-400">or</span>
          <hr className="flex-grow border-gray-300" />
        </div>

        {/* Google Sign In */}
        <button 
          onClick={handleGoogleSignIn}
          disabled={isGoogleLoading}
          className="w-full border flex items-center justify-center py-3 rounded-md hover:bg-gray-50 transition-colors duration-200 disabled:opacity-50"
        >
          {isGoogleLoading ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-indigo-600 border-t-transparent mr-2"></div>
              <span>Signing in with Google...</span>
            </div>
          ) : (
            <>
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>Continue with Google</span>
            </>
          )}
        </button>

        {/* Sign Up */}
        <p className="text-center text-gray-600 mt-6 text-sm">
          Don't have an account?{" "}
          <button 
            onClick={onSwitchToRegister}
            className="text-indigo-600 hover:underline cursor-pointer"
          >
            Sign up
          </button>
        </p>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100 transition-colors duration-200 z-10"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};
