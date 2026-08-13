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
    <div className="bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 min-h-screen flex flex-col">
      {/* HEADER */}
      <header
        className="sticky top-0 z-50 flex h-16 items-center 
         bg-white dark:bg-gray-900 
         border-b border-gray-200 dark:border-gray-700 shadow-sm px-6"
      >
        <div className="w-full flex items-center justify-between relative">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center">
              <Image
                src="/images/logo.png"
                alt={`${SITE_NAME} logo`}
                width={64}
                height={64}
                className="h-14 w-auto lg:h-16 object-contain dark:invert"
                priority
              />
            </Link>

            <Link
              href="/"
              className={`hidden lg:block text-3xl font-bold ${pacifico.className}`}
            >
              {SITE_NAME}
            </Link>
          </div>

          <HeaderNav />
          <div className="flex items-center gap-4 px-2">
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>
      </header>

      {/* BODY WITH SIDEBAR */}
      <div className="flex flex-1">
        <main className="flex-1 px-4 py-1">{children}</main>
        <CrowdChatWidget />
      </div>

      {/* FOOTER */}
      <footer className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-6 py-2 text-sm">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-5">
          {/* Brand */}
          <div className="space-y-3">
            <Link href="/" className="flex items-center gap-3">
              <Image
                src="/images/logo.png"
                alt={`${SITE_NAME} logo`}
                width={48}
                height={48}
                className="h-12 w-auto object-contain dark:invert"
              />
              <span className="text-xl font-semibold text-gray-800 dark:text-gray-200">
                {SITE_NAME}
              </span>
            </Link>

            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
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
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
              Contact
            </h3>
            <ul className="space-y-2 text-gray-600 dark:text-gray-400">
              <li>
                <a
                  href={`mailto:${SENDER_EMAIL_ADDRESS}`}
                  aria-label={`Email ${SITE_NAME}`}
                  className="transition hover:text-gray-800 dark:hover:text-gray-200"
                >
                  {SENDER_EMAIL_ADDRESS}
                </a>
              </li>
              {/* <li>
                <a
                  href="tel:+1234567890"
                  className="hover:text-gray-800 dark:hover:text-gray-200"
                >
                  +1 (234) 567‑890
                </a>
              </li> */}
              {/* <li>Athens, Ohio, USA</li> */}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
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
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
              Share
            </h3>
            <FooterShare />
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 text-center text-gray-600 dark:text-gray-400">
          © {new Date().getFullYear()} {SITE_NAME}. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
