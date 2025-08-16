import React, { useState, useEffect } from "react";
import { Hero } from "./components/Hero";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import ChatPage from "./pages/ChatPage";
import AdminDashboard from "./pages/AdminDashboard";
import NearbyMapPage from "./pages/NearbyMapPage";
import { AuthProvider, useAuth } from "./context/AuthContext";

// Component to handle routing based on authentication and admin status
const AppContent = () => {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState("home");
  const [invitationData, setInvitationData] = useState(null);
  
  console.log('AppContent: Auth state:', { isAuthenticated, isAdmin, loading });

  const handleNavigateToChat = (userEmail = null, userData = null) => {
    setCurrentPage("chat");
    // If userEmail is provided, we can pass it to the chat page
    // This will be used to start a conversation with the selected user
    if (userEmail) {
      // Store the user email in sessionStorage for the chat page to use
      sessionStorage.setItem('chat_with_user', userEmail);
      
      // Store user data if provided
      if (userData) {
        sessionStorage.setItem('chat_with_user_data', JSON.stringify(userData));
      }
    }
  };

  const handleNavigateToHome = () => {
    setCurrentPage("home");
  };

  const handleNavigateToNearbyMap = () => {
    setCurrentPage("nearby-map");
  };

  const handleNavigateBack = () => {
    setCurrentPage("chat");
  };

  // Handle invitation links
  useEffect(() => {
    const path = window.location.pathname;
    const invitationMatch = path.match(/\/forums\/(\d+)\/join/);
    
    if (invitationMatch && isAuthenticated) {
      const forumId = parseInt(invitationMatch[1]);
      setInvitationData({ forumId });
      setCurrentPage("chat");
      
      // Store invitation data for the Forums component to use
      sessionStorage.setItem('pending_invitation', JSON.stringify({ forumId }));
      
      // Clean up the URL
      window.history.replaceState({}, document.title, '/');
    }
  }, [isAuthenticated]);

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If user is authenticated and is admin, show admin dashboard
  if (isAuthenticated && isAdmin) {
    console.log('AppContent: Redirecting to AdminDashboard - isAuthenticated:', isAuthenticated, 'isAdmin:', isAdmin);
    return (
      <div className="h-screen">
        <AdminDashboard />
      </div>
    );
  }

  // If user is authenticated but not admin, show appropriate page
  if (isAuthenticated && !isAdmin) {
    console.log('AppContent: User authenticated but not admin - redirecting to chat/nearby map');
    if (currentPage === "chat") {
      return (
        <div className="h-screen">
          <ChatPage 
            onNavigateToNearbyMap={handleNavigateToNearbyMap} 
            invitationData={invitationData}
          />
        </div>
      );
    }
    
    if (currentPage === "nearby-map") {
      return (
        <div className="h-screen">
          <NearbyMapPage 
            onNavigateToChat={handleNavigateToChat} 
            onNavigateBack={handleNavigateBack}
          />
        </div>
      );
    }
  }

  // Show home page
  return (
    <div className="flex flex-col min-h-screen bg-white text-gray-900">
      <Navbar onNavigateToChat={handleNavigateToChat} />
      <main className="flex-grow">
        <Hero onNavigateToChat={handleNavigateToChat} />
      </main>
      <Footer />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
