import React from "react";

export const Footer = () => {
  return (
    <footer className="text-center text-gray-500 text-sm py-6 border-t">
      <p>
        By messaging StudVerse, you agree to our{" "}
        <a href="/terms" className="underline hover:text-blue-600">
          Terms of Service
        </a>{" "}
        and have read our{" "}
        <a href="/privacy" className="underline hover:text-blue-600">
          Privacy Policy
        </a>.
      </p>
    </footer>
  );
};
