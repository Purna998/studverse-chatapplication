import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../utils/api";

export const Login = ({ onClose, onLoginSuccess }) => {
  const [formData, setFormData] = useState({
    username: "",
    password: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuth();

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
        // Login successful - store tokens
        localStorage.setItem('access_token', data.access);
        localStorage.setItem('refresh_token', data.refresh);
        localStorage.setItem('username', formData.username);
        
        console.log('Tokens stored, updating auth context...');
        
        // Update auth context
        login({ username: formData.username });
        
        console.log('Auth context updated, closing modal...');
        
        // Close modal and redirect to chat
        onClose();
        if (onLoginSuccess) {
          console.log('Calling onLoginSuccess...');
          onLoginSuccess();
        }
      } else {
        // Login failed
        console.log('Login failed:', data.detail);
        setError(data.detail || 'Invalid username or password.');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Network error. Please check your connection.');
    } finally {
      setIsLoading(false);
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
            className="w-full border rounded-md p-3 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />

          {/* Password */}
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleInputChange}
            className="w-full border rounded-md p-3 mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />

          {/* Forgot password */}
          <div className="flex justify-end mb-6">
            <a href="#" className="text-blue-600 text-sm hover:underline">
              Forgot password?
            </a>
          </div>

          {/* Sign In Button */}
          <button 
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 rounded-md transition-colors duration-200"
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
        <button className="w-full border flex items-center justify-center py-3 rounded-md hover:bg-gray-50">
          <img src="/google-icon.svg" alt="Google" className="w-5 h-5 mr-2" />
          Sign In with Google
        </button>

        {/* Sign Up */}
        <p className="text-center text-gray-600 mt-6 text-sm">
          Don't have an account?{" "}
          <a href="#" className="text-blue-600 hover:underline">
            Sign up
          </a>
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
