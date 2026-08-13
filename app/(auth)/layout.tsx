import "../globals.css";
import { Toaster } from "sonner";
import type { Metadata } from "next";
import Link from "next/link";
import { Pacifico } from "next/font/google";
import { SITE_NAME } from "@/utils/constants";
import ThemeToggle from "@/components/shared/ThemeToggle";
import Image from "next/image";

export const metadata: Metadata = {
  title: {
    default: `Authentication | ${SITE_NAME}`,
    template: `%s | ${SITE_NAME}`,
  },
  description: `Authentication pages for the ${SITE_NAME} platform.`,
};

const pacifico = Pacifico({
  subsets: ["latin"],
  weight: "400",
});

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Toaster
        position="top-right"
        theme="system"
        duration={5000}
        richColors
        visibleToasts={1}
        closeButton
      />

      {/* Header */}
      <header className="sticky top-0 z-50 flex h-16 items-center justify-between px-6 bg-white dark:bg-gray-800 shadow-sm dark:shadow-gray-700/50">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/images/logo.png"
            alt={`${SITE_NAME} logo`}
            width={40}
            height={40}
            className="object-contain dark:invert"
          />
          <span className={`text-2xl font-bold ${pacifico.className}`}>
            {SITE_NAME}
          </span>
        </Link>

        <ThemeToggle />
      </header>

      {/* Page renders its own layout */}
      {children}

      {/* Footer */}
      <footer className="py-4 text-center text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        © {new Date().getFullYear()}{" "}
        <Link
          href="/"
          className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
        >
          {SITE_NAME}
        </Link>
        . All rights reserved.
      </footer>
    </>
  );
}
