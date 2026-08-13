"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Film, Map } from "lucide-react";

export default function HeaderNav() {
  const pathname = usePathname();

  return (
    <nav
      className="
        flex items-center gap-10 text-sm font-medium
        absolute left-1/2 -translate-x-1/2 mr-2
      "
    >
      {/* HOME */}
      <Link
        href="/"
        className={`flex items-center gap-2 transition
          ${
            pathname === "/"
              ? "text-blue-600 dark:text-blue-400 font-semibold"
              : "hover:text-blue-600 dark:hover:text-blue-400"
          }
        `}
      >
        <Home size={20} />
        <span className="hidden md:inline">Home</span>
      </Link>

      {/* REELS */}
      <Link
        href="/reel"
        className={`flex items-center gap-2 transition
          ${
            pathname.startsWith("/reel")
              ? "text-blue-600 dark:text-blue-400 font-semibold"
              : "hover:text-blue-600 dark:hover:text-blue-400"
          }
        `}
      >
        <Film size={20} />
        <span className="hidden md:inline">Reels</span>
      </Link>

      {/* MAP */}
      <Link
        href="/map"
        className={`flex items-center gap-2 transition
          ${
            pathname.startsWith("/map")
              ? "text-blue-600 dark:text-blue-400 font-semibold"
              : "hover:text-blue-600 dark:hover:text-blue-400"
          }
        `}
      >
        <Map size={20} />
        <span className="hidden md:inline">Map</span>
      </Link>
    </nav>
  );
}
