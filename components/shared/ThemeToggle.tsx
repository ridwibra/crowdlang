"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle theme"
      className="
        relative flex items-center justify-center
        w-12 h-12 rounded-xl
        bg-gray-100 dark:bg-gray-800
        border border-gray-300 dark:border-gray-700
        shadow-sm dark:shadow-md
        hover:bg-gray-200 dark:hover:bg-gray-700
        transition-all duration-300
        group
      "
    >
      {/* Moon Icon */}
      <Moon
        size={18}
        className="
          text-gray-700 dark:text-gray-400
          transition-all duration-300
          absolute
          opacity-100 scale-100 rotate-0
          dark:opacity-0 dark:scale-0 dark:-rotate-90
        "
      />

      {/* Sun Icon */}
      <Sun
        size={18}
        className="
          text-yellow-500 dark:text-yellow-300
          transition-all duration-300
          absolute
          opacity-0 scale-0 rotate-90
          dark:opacity-100 dark:scale-100 dark:rotate-0
        "
      />

      {/* Glow on hover */}
      <span
        className="
          absolute inset-0 rounded-xl
          bg-yellow-400/10 dark:bg-yellow-300/10
          opacity-0 group-hover:opacity-100
          blur-md transition-all duration-300
        "
      />
    </button>
  );
}
