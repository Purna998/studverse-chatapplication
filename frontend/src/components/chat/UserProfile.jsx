import React from "react";

const UserProfile = () => {
  return (
    <div className="h-full p-6">
      {/* Profile Header */}
      <div className="text-center mb-6">
        <div className="relative inline-block">
          <img
            src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&h=120&fit=crop&crop=face"
            alt="Purna Acharya"
            className="w-24 h-24 rounded-full object-cover mx-auto mb-4 border-4 border-white shadow-lg"
          />
          <div className="absolute bottom-4 right-4 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
        </div>
        
        <h2 className="text-xl font-bold text-gray-900 mb-1">Purna Acharya</h2>
        <p className="text-sm text-gray-600 mb-4">Student, LTU</p>
      </div>

      {/* Bio Section */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">About</h3>
        <p className="text-sm text-gray-700 leading-relaxed">
          I am a Tech aficiando, fast learner and student of Bachelor of Technology in Computer Science and Artificial Intelligence.
        </p>
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
            <p className="text-sm text-gray-900">purna.acharya@ltu.edu</p>
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

      {/* Actions */}
      <div className="mt-8 space-y-3">
        <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors duration-200 text-sm font-medium">
          Send Message
        </button>
        <button className="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors duration-200 text-sm font-medium">
          View Profile
        </button>
      </div>
    </div>
  );
};

export default UserProfile; 