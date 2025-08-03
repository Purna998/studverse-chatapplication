import React, { useState, useEffect } from "react";
import { api } from "../utils/api";

export const Register = ({ onClose }) => {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    first_name: "",
    college_name: ""
  });
  const [colleges, setColleges] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingColleges, setIsLoadingColleges] = useState(true);
  const [error, setError] = useState("");

  // Load colleges when component mounts
  useEffect(() => {
    const loadColleges = async () => {
      try {
        const response = await api.getColleges();
        if (response.data) {
          setColleges(response.data);
        }
      } catch (error) {
        console.error('Error loading colleges:', error);
      } finally {
        setIsLoadingColleges(false);
      }
    };

    loadColleges();
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

    try {
      const data = await api.register(formData);

      if (data.message) {
        // Registration successful
        alert('Registration successful! Please login.');
        onClose();
      } else {
        // Registration failed
        setError(data.message || 'Registration failed. Please try again.');
      }
    } catch (error) {
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
        <h1 className="text-2xl font-bold mb-6">Create Account</h1>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Full Name */}
          <input
            type="text"
            name="first_name"
            placeholder="Full Name"
            value={formData.first_name}
            onChange={handleInputChange}
            className="w-full border rounded-md p-3 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />

          {/* College Name Dropdown */}
          <div className="mb-4">
            <select
              name="college_name"
              value={formData.college_name}
              onChange={handleInputChange}
              className="w-full border rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              disabled={isLoadingColleges}
            >
              <option value="">Select College</option>
              {colleges.map((college) => (
                <option key={college.id} value={college.name}>
                  {college.name}
                </option>
              ))}
            </select>
            {isLoadingColleges && (
              <p className="text-sm text-gray-500 mt-1">Loading colleges...</p>
            )}
          </div>

          {/* Email */}
          <input
            type="email"
            name="email"
            placeholder="Email address"
            value={formData.email}
            onChange={handleInputChange}
            className="w-full border rounded-md p-3 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />

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
            className="w-full border rounded-md p-3 mb-6 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />

          {/* Sign Up Button */}
          <button 
            type="submit"
            disabled={isLoading || isLoadingColleges}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 rounded-md transition-colors duration-200"
          >
            {isLoading ? "Creating Account..." : "Sign Up"}
          </button>
        </form>

        {/* OR */}
        <div className="flex items-center my-6">
          <hr className="flex-grow border-gray-300" />
          <span className="mx-3 text-gray-400">or</span>
          <hr className="flex-grow border-gray-300" />
        </div>

        {/* Google Sign Up */}
        <button className="w-full border flex items-center justify-center py-3 rounded-md hover:bg-gray-50">
          <img src="/google-icon.svg" alt="Google" className="w-5 h-5 mr-2" />
          Sign Up with Google
        </button>

        {/* Sign In */}
        <p className="text-center text-gray-600 mt-6 text-sm">
          Already have an account?{" "}
          <a href="#" className="text-blue-600 hover:underline">
            Sign in
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