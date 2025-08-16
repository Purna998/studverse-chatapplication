import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../utils/api";

const UserProfile = ({ onClose }) => {
  const { user, logout, updateUserData } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    description: "",
    college_name: "",
  });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Load user profile on component mount
  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getUserProfile();
      
      if (response.data) {
        setProfile(response.data);
        setFormData({
          description: response.data.description || "",
          college_name: response.data.college_name || "",
        });
      } else {
        setError("Failed to load profile");
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      setError("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleProfilePictureUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("Image size should be less than 5MB");
      return;
    }

    try {
      setUploading(true);
      setError(null);
      setSuccess(null);

      console.log('Uploading file:', file.name, 'Size:', file.size, 'Type:', file.type);
      const response = await api.uploadProfilePicture(file);
      console.log('Upload response:', response);
      
      if (response.success) {
        console.log('Profile picture upload successful:', response.data.profile_picture);
        
        // Update the user data in AuthContext so the navbar reflects the new profile picture
        updateUserData({
          profile_picture: response.data.profile_picture
        });
        
        // Update the local profile state
        setProfile(prev => ({
          ...prev,
          profile_picture: response.data.profile_picture
        }));
        
        setSuccess("Profile picture updated successfully!");
        
        // Trigger custom event for real-time header update
        window.dispatchEvent(new CustomEvent('profilePictureUpdated', {
          detail: { 
            profilePicture: response.data.profile_picture,
            timestamp: Date.now()
          }
        }));
        
        console.log('Profile picture update event dispatched');
      } else {
        setError(response.error || "Failed to upload profile picture");
      }
    } catch (error) {
      console.error("Error uploading profile picture:", error);
      setError("Failed to upload profile picture. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveProfile = async () => {
    try {
      setError(null);
      setSuccess(null);

      const response = await api.updateProfile(formData);
      
      if (response.message) {
        setProfile(prev => ({
          ...prev,
          ...formData
        }));
        setSuccess("Profile updated successfully!");
        setEditing(false);
      } else {
        setError(response.error || "Failed to update profile");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      setError("Failed to update profile");
    }
  };

  const handleCancelEdit = () => {
    setFormData({
      description: profile?.description || "",
      college_name: profile?.college_name || "",
    });
    setEditing(false);
    setError(null);
    setSuccess(null);
  };

  if (loading) {
    return (
      <div className="h-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors duration-200"
          title="Close Profile"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-gray-600 text-sm">Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="h-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors duration-200"
          title="Close Profile"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <p className="text-red-600 text-sm mb-2">{error}</p>
            <button
              onClick={loadProfile}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full p-6 relative">
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors duration-200"
        title="Close Profile"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Success/Error Messages */}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-700 text-sm">{success}</p>
        </div>
      )}
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Profile Header */}
      <div className="text-center mb-6">
        <div className="relative inline-block">
          <img
            src={profile?.profile_picture || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&h=120&fit=crop&crop=face"}
            alt={profile?.full_name || user?.username || "User"}
            className="w-24 h-24 rounded-full object-cover mx-auto mb-4 border-4 border-white shadow-lg"
          />
          <div className="absolute bottom-4 right-4 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
          
          {/* Profile Picture Upload Button */}
          <label className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 border-2 border-white rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-700 transition-colors duration-200">
            <input
              type="file"
              accept="image/*"
              onChange={handleProfilePictureUpload}
              className="hidden"
              disabled={uploading}
            />
            {uploading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
            ) : (
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            )}
          </label>
          
          {/* Upload progress indicator */}
          {uploading && (
            <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent"></div>
            </div>
          )}
        </div>
        
        <h2 className="text-xl font-bold text-gray-900 mb-1">{profile?.full_name || user?.username || "User"}</h2>
        <p className="text-sm text-gray-600 mb-4">{profile?.college_name || "Student"}</p>
      </div>

      {/* Bio Section */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-900">About</h3>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="text-blue-600 hover:text-blue-700 text-xs font-medium"
            >
              Edit
            </button>
          )}
        </div>
        
        {editing ? (
          <div className="space-y-3">
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Tell us about yourself..."
              className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
              rows="3"
            />
            <div className="flex space-x-2">
              <button
                onClick={handleSaveProfile}
                className="flex-1 bg-blue-600 text-white py-1 px-3 rounded text-xs font-medium hover:bg-blue-700 transition-colors duration-200"
              >
                Save
              </button>
              <button
                onClick={handleCancelEdit}
                className="flex-1 border border-gray-300 text-gray-700 py-1 px-3 rounded text-xs font-medium hover:bg-gray-50 transition-colors duration-200"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-700 leading-relaxed">
            {profile?.description || "No description available"}
          </p>
        )}
        
        <div className="mt-3 flex items-center space-x-2">
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            Active Now
          </span>
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Online
          </span>
        </div>
      </div>

      {/* Contact Info */}
      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <p className="text-xs text-gray-500">Email</p>
            <p className="text-sm text-gray-900">{profile?.email || user?.email || "No email"}</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <p className="text-xs text-gray-500">Location</p>
            <p className="text-sm text-gray-900">Kathmandu, Nepal</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <div>
            <p className="text-xs text-gray-500">Course</p>
            <p className="text-sm text-gray-900">B.Tech Computer Science & AI</p>
          </div>
        </div>
      </div>

      {/* Quick Settings */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick Settings</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">Notifications</span>
            <button className="w-10 h-6 bg-blue-500 rounded-full relative">
              <div className="w-4 h-4 bg-white rounded-full absolute top-1 right-1 transition-transform duration-200"></div>
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">Sound</span>
            <button className="w-10 h-6 bg-gray-300 rounded-full relative">
              <div className="w-4 h-4 bg-white rounded-full absolute top-1 left-1 transition-transform duration-200"></div>
            </button>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-8 space-y-3">
        <button 
          onClick={logout}
          className="w-full border border-red-300 text-red-600 py-2 px-4 rounded-lg hover:bg-red-50 transition-colors duration-200 text-sm font-medium"
        >
          Logout
        </button>
      </div>
    </div>
  );
};

export default UserProfile; 