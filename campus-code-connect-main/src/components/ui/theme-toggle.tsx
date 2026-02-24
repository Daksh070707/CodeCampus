import React, { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "site-theme";

export default function ThemeToggle() {
  const [mode, setMode] = useState<"light" | "dark">(() => {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      // Default to bright (light) mode when no preference exists
      return v === "dark" ? "dark" : "light";
    } catch {
      return "light";
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (mode === "light") {
      root.classList.add("light");
    } else {
      root.classList.remove("light");
    }
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {}
  }, [mode]);

  const toggle = () => setMode((m) => (m === "light" ? "dark" : "light"));

  return (
    <Button
      variant="outline"
      size="icon"
      aria-label={mode === "light" ? "Switch to dark mode" : "Switch to bright mode"}
      onClick={toggle}
      title={mode === "light" ? "Bright mode" : "Dark mode"}
    >
      {mode === "light" ? (
        <Sun className="w-5 h-5 text-yellow-500" />
      ) : (
        <Moon className="w-5 h-5 text-slate-300" />
      )}
    </Button>
  );
}
