import React, { useState } from "react";
import { Hero } from "./components/Hero";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import ChatPage from "./pages/ChatPage";
import { AuthProvider } from "./context/AuthContext";

export default function App() {
  const [currentPage, setCurrentPage] = useState("home");

  const handleNavigateToChat = () => {
    setCurrentPage("chat");
  };

  const handleNavigateToHome = () => {
    setCurrentPage("home");
  };

  if (currentPage === "chat") {
    return (
      <AuthProvider>
        <div className="h-screen">
          <ChatPage />
          <button
            onClick={handleNavigateToHome}
            className="fixed top-4 left-4 z-50 bg-white/90 backdrop-blur-sm text-gray-600 hover:text-gray-800 p-2 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 border border-gray-200"
            title="Back to Home"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </button>
        </div>
      </AuthProvider>
    );
  }

  return (
    <AuthProvider>
      <div className="flex flex-col min-h-screen bg-white text-gray-900">
        <Navbar onNavigateToChat={handleNavigateToChat} />
        <main className="flex-grow">
          <Hero onNavigateToChat={handleNavigateToChat} />
        </main>
        <Footer />
      </div>
    </AuthProvider>
  );
}
