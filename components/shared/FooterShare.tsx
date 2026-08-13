"use client";

import { useEffect, useState } from "react";
import { SITE_NAME } from "@/utils/constants";
import Link from "next/link";

export default function FooterShare() {
  const [shareUrl, setShareUrl] = useState("");

  useEffect(() => {
    setShareUrl(window.location.href);
  }, []);

  const shareNative = () => {
    if (navigator.share) {
      navigator.share({
        title: SITE_NAME,
        text: "Check out this amazing language resource!",
        url: shareUrl,
      });
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
  };

  return (
    <ul className="space-y-2 text-gray-600 dark:text-gray-400">
      <li>
        <button
          onClick={shareNative}
          className="flex items-center gap-2 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
        >
          <span className="text-base">📱</span>
          <span className="cursor-pointer">Native Share</span>
        </button>
      </li>

      <li>
        <Link
          href={`https://twitter.com/intent/tweet?text=Check%20out%20${SITE_NAME}!&url=${encodeURIComponent(
            shareUrl,
          )}`}
          target="_blank"
          className="flex items-center gap-2 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
        >
          <span className="text-base">🐦</span>
          <span className="cursor-pointer">Twitter / X</span>
        </Link>
      </li>

      <li>
        <Link
          href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
            shareUrl,
          )}`}
          target="_blank"
          className="flex items-center gap-2 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
        >
          <span className="text-base">📘</span>
          <span className="cursor-pointer">Facebook</span>
        </Link>
      </li>

      <li>
        <button
          onClick={copyLink}
          className="flex items-center gap-2 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
        >
          <span className="text-base">🔗</span>
          <span className="cursor-pointer">Copy Link</span>
        </button>
      </li>
    </ul>
  );
}
