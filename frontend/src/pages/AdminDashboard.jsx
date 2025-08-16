import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../utils/api";
import UsersSection from "../components/admin/UsersSection";
import MessagesSection from "../components/admin/MessagesSection";
import CollegesSection from "../components/admin/CollegesSection";
import GroupsSection from "../components/admin/GroupsSection";
import ForumsSection from "../components/admin/ForumsSection";

const AdminDashboard = ({ onClose }) => {
  const { user, logout } = useAuth();
  const [activeSection, setActiveSection] = useState("users");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const handleLogout = () => {
    logout();
    window.location.reload(); // Refresh to go back to home
  };

  const sections = [
    { id: "users", name: "Users", icon: "👥" },
    { id: "messages", name: "Messages", icon: "💬" },
    { id: "colleges", name: "Colleges", icon: "🏫" },
    { id: "groups", name: "Groups", icon: "👥" },
    { id: "forums", name: "Forums", icon: "📢" },
  ];

  const renderSection = () => {
    switch (activeSection) {
      case "users":
        return <UsersSection />;
      case "messages":
        return <MessagesSection />;
      case "colleges":
        return <CollegesSection />;
      case "groups":
        return <GroupsSection />;
      case "forums":
        return <ForumsSection />;
      default:
        return <UsersSection />;
    }
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <span className="text-xl font-bold text-gray-900">STUDVERSE</span>
            <p className="text-sm text-gray-600">Admin Dashboard</p>
          </div>
        </div>

        {/* Right Side - User Info and Actions */}
        <div className="flex items-center space-x-4">
          {/* User Profile */}
          <div className="flex items-center space-x-3">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{user?.full_name || user?.username || `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'Admin'}</p>
              <p className="text-xs text-gray-500">Administrator</p>
            </div>
            <div className="relative">
              <img
                src={user?.profile_picture || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop&crop=face"}
                alt="Profile"
                className="w-8 h-8 rounded-full object-cover"
                onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop&crop=face"; }}
              />
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors duration-200"
            title="Logout"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </header>

      {/* Navigation */}
      <div className="flex border-b border-gray-200 bg-white">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className={`flex items-center space-x-2 px-6 py-4 text-sm font-medium transition-colors duration-200 ${
              activeSection === section.id
                ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            <span className="text-lg">{section.icon}</span>
            <span>{section.name}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {renderSection()}
      </div>
    </div>
  );
};

export default AdminDashboard; 