import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Initialize theme from localStorage to prevent flash
(function () {
  try {
    const stored = localStorage.getItem("site-theme");
    const theme = stored === "dark" || stored === "light" ? stored : "light";
    
    if (theme === "light") {
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.remove("light");
    }
  } catch {
    // Fallback: default to light theme
    document.documentElement.classList.add("light");
  }
})();

createRoot(document.getElementById("root")!).render(<App />);
