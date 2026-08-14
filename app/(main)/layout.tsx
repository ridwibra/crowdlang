import "../globals.css";
import type { Metadata } from "next";
import { Pacifico } from "next/font/google";
import Link from "next/link";
import { SENDER_EMAIL_ADDRESS, SITE_NAME } from "@/utils/constants";
import FooterShare from "@/components/shared/FooterShare";
import HeaderNav from "@/components/shared/HeaderNav";
import ThemeToggle from "@/components/shared/ThemeToggle";
import UserMenu from "@/components/shared/UserMenu";
import Image from "next/image";
import CrowdChatWidget from "@/components/CrowdChatWidget";
import Marquee from "@/components/Marquee";

export const metadata: Metadata = {
  title: {
    default: `${SITE_NAME} – languages of the world`,
    template: `%s | ${SITE_NAME}`,
  },
  description: `${SITE_NAME} to make languages visible`,
};

const pacifico = Pacifico({
  subsets: ["latin"],
  weight: "400",
});

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen min-w-0 w-full flex-col overflow-x-hidden bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      {/* HEADER */}
      <header
        className="
          sticky top-0 z-50
          flex h-16 w-full shrink-0 items-center
          border-b border-gray-200 bg-white px-3 shadow-sm
          dark:border-gray-700 dark:bg-gray-900
          sm:px-6
        "
      >
        <div className="flex min-w-0 w-full items-center justify-between gap-2">
          {/* Logo / Brand */}
          <div className="flex min-w-0 shrink-0 items-center gap-3">
            <Link href="/" className="flex shrink-0 items-center">
              <Image
                src="/images/logo.png"
                alt={`${SITE_NAME} logo`}
                width={64}
                height={64}
                className="h-12 w-auto object-contain dark:invert sm:h-14 lg:h-16"
                priority
              />
            </Link>

            <Link
              href="/"
              className={`hidden truncate text-3xl font-bold lg:block ${pacifico.className}`}
            >
              {SITE_NAME}
            </Link>
          </div>

          {/* Navigation */}
          <div className="min-w-0 flex-1">
            <HeaderNav />
          </div>

          {/* User controls */}
          <div className="ml-1 flex shrink-0 items-center gap-2 px-0 sm:ml-4 sm:gap-4 sm:px-2">
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>
      </header>
      <Marquee />
      {/* BODY */}
      <div className="relative flex min-h-0 min-w-0 flex-1">
        <main className="min-h-0 min-w-0 w-full flex-1 px-3 py-1 sm:px-4">
          {children}
        </main>

        {/* Keep this from affecting page width */}
        <div className="pointer-events-none fixed inset-0 z-40">
          <div className="pointer-events-auto">
            <CrowdChatWidget />
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="w-full shrink-0 border-t border-gray-200 bg-white px-4 py-4 text-sm dark:border-gray-700 dark:bg-gray-900 sm:px-6">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-5">
          {/* Brand */}
          <div className="min-w-0 space-y-3">
            <Link href="/" className="flex items-center gap-3">
              <Image
                src="/images/logo.png"
                alt={`${SITE_NAME} logo`}
                width={48}
                height={48}
                className="h-12 w-auto object-contain dark:invert"
              />

              <span className="truncate text-xl font-semibold text-gray-800 dark:text-gray-200">
                {SITE_NAME}
              </span>
            </Link>

            <p className="leading-relaxed text-gray-600 dark:text-gray-400">
              Making the languages of the world visible, accessible, and
              beautifully organized.
            </p>
          </div>

          {/* Discover */}
          <div>
            <h3 className="mb-3 text-lg font-semibold text-gray-800 dark:text-gray-200">
              Discover
            </h3>

            <ul className="space-y-2 text-gray-600 dark:text-gray-400">
              <li>
                <Link
                  href="/footer/about"
                  className="transition hover:text-gray-800 dark:hover:text-gray-200"
                >
                  About {SITE_NAME}
                </Link>
              </li>

              <li>
                <Link
                  href="/footer/howitworks"
                  className="transition hover:text-gray-800 dark:hover:text-gray-200"
                >
                  How It Works
                </Link>
              </li>

              <li>
                <Link
                  href="/reel"
                  className="transition hover:text-gray-800 dark:hover:text-gray-200"
                >
                  Explore Reels
                </Link>
              </li>

              <li>
                <Link
                  href="/map"
                  className="transition hover:text-gray-800 dark:hover:text-gray-200"
                >
                  Language Maps
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div className="min-w-0">
            <h3 className="mb-3 text-lg font-semibold text-gray-800 dark:text-gray-200">
              Contact
            </h3>

            <ul className="space-y-2 text-gray-600 dark:text-gray-400">
              <li className="break-words">
                <a
                  href={`mailto:${SENDER_EMAIL_ADDRESS}`}
                  aria-label={`Email ${SITE_NAME}`}
                  className="transition hover:text-gray-800 dark:hover:text-gray-200"
                >
                  {SENDER_EMAIL_ADDRESS}
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="mb-3 text-lg font-semibold text-gray-800 dark:text-gray-200">
              Legal
            </h3>

            <ul className="space-y-2 text-gray-600 dark:text-gray-400">
              <li>
                <Link
                  href="/footer/terms"
                  className="hover:text-gray-800 dark:hover:text-gray-200"
                >
                  Terms of Service
                </Link>
              </li>

              <li>
                <Link
                  href="/footer/privacy"
                  className="hover:text-gray-800 dark:hover:text-gray-200"
                >
                  Privacy Policy
                </Link>
              </li>

              <li>
                <Link
                  href="/footer/delete"
                  className="hover:text-gray-800 dark:hover:text-gray-200"
                >
                  Account Deletion Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Share */}
          <div>
            <h3 className="mb-3 text-lg font-semibold text-gray-800 dark:text-gray-200">
              Share
            </h3>

            <FooterShare />
          </div>
        </div>

        <div className="mt-4 border-t border-gray-200 pt-3 text-center text-gray-600 dark:border-gray-700 dark:text-gray-400">
          © {new Date().getFullYear()} {SITE_NAME}. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
