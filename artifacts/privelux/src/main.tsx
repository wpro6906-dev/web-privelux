import { createRoot } from "react-dom/client";
import { setBaseUrl } from "@workspace/api-client-react";
import { HelmetProvider } from "react-helmet-async";
import App from "./App";
import "./index.css";

// In production (Vercel + Render) set VITE_API_URL to the Render backend URL.
// In Replit the API is served on the same origin so no base URL is needed.
setBaseUrl(import.meta.env.VITE_API_URL || "");

document.documentElement.classList.add("dark");

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);
