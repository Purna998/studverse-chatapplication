import React, { useState } from "react";
import { Register } from "./Register";

export const Hero = ({ onNavigateToChat }) => {
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);

  const handleRegisterClick = () => {
    setIsRegisterOpen(true);
  };

  const handleCloseRegister = () => {
    setIsRegisterOpen(false);
  };

  return (
    <>
      <section className="flex flex-col items-center text-center px-6 py-16">
        {/* Illustration */}
        <img
          src="/communication.svg"
          alt="Collaboration Illustration"
          className="max-w-md mb-8"
        />

        {/* Tagline */}
        <h1 className="text-3xl md:text-5xl font-bold leading-tight mb-4">
          Chat, Learn, Collaborate and{" "}
          <span className="text-yellow-500">Build</span> Your Own
        </h1>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mt-6">
          <button 
            onClick={handleRegisterClick}
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 space-x-2"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            <span>Join as Student</span>
          </button>

          <button 
            onClick={onNavigateToChat}
            className="inline-flex items-center px-6 py-3 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 space-x-2"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span>Try Chat Demo</span>
          </button>
        </div>
      </section>

      {/* Register Modal */}
      {isRegisterOpen && <Register onClose={handleCloseRegister} />}
    </>
  );
};
