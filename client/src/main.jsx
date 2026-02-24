import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "react-hot-toast";
import "./App.css";
import App from "./App.jsx";
import { AuthProvider } from "./AuthContext.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <App />
      <Toaster
        position="top-right"
        reverseOrder={false}
        toastOptions={{
          style: {
            borderRadius: "10px",
            background: "#1a1d2e",
            color: "#e2e8f0",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            fontFamily: "Inter, system-ui, sans-serif",
            fontSize: "0.9rem",
          },
          success: {
            iconTheme: { primary: "#22c55e", secondary: "#1a1d2e" },
          },
          error: {
            iconTheme: { primary: "#ef4444", secondary: "#1a1d2e" },
          },
          duration: 4000,
        }}
      />
    </AuthProvider>
  </StrictMode>,
);
