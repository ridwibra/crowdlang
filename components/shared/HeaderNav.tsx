"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Film, Map } from "lucide-react";

export default function HeaderNav() {
  const pathname = usePathname();

  return (
    <nav
      className="
        absolute left-20 right-36 flex items-center justify-center gap-6
        text-sm font-medium
        md:left-1/2 md:right-auto md:-translate-x-1/2 md:gap-8
        lg:gap-10
      "
    >
      <Link
        href="/"
        className={`flex items-center gap-2 transition ${
          pathname === "/"
            ? "font-semibold text-blue-600 dark:text-blue-400"
            : "hover:text-blue-600 dark:hover:text-blue-400"
        }`}
      >
        <Home size={20} />
        <span className="hidden md:inline">Home</span>
      </Link>

      <Link
        href="/reel"
        className={`flex items-center gap-2 transition ${
          pathname.startsWith("/reel")
            ? "font-semibold text-blue-600 dark:text-blue-400"
            : "hover:text-blue-600 dark:hover:text-blue-400"
        }`}
      >
        <Film size={20} />
        <span className="hidden md:inline">Reels</span>
      </Link>

      <Link
        href="/map"
        className={`flex items-center gap-2 transition ${
          pathname.startsWith("/map")
            ? "font-semibold text-blue-600 dark:text-blue-400"
            : "hover:text-blue-600 dark:hover:text-blue-400"
        }`}
      >
        <Map size={20} />
        <span className="hidden md:inline">Map</span>
      </Link>
    </nav>
  );
}
