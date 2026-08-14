"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type MarqueeData = {
  _id: string;
  text: string;
  link?: string;
  isActive: boolean;
  speed: number;
  backgroundColor: string;
  textColor: string;
};

export default function Marquee() {
  const [marquee, setMarquee] = useState<MarqueeData | null>(null);

  useEffect(() => {
    async function loadMarquee() {
      try {
        const response = await fetch("/api/marquee", {
          cache: "no-store",
        });

        if (!response.ok) return;

        const data = await response.json();

        const activeMarquee = data.marquees.find(
          (item: MarqueeData) => item.isActive,
        );

        setMarquee(activeMarquee || null);
      } catch (error) {
        console.error("Could not load marquee:", error);
      }
    }

    loadMarquee();
  }, []);

  if (!marquee) return null;

  const content = (
    <span
      className="marquee-track inline-flex min-w-max items-center gap-8 px-4 py-2 text-sm font-semibold"
      style={{
        animationDuration: `${marquee.speed}s`,
        color: marquee.textColor,
      }}
    >
      <span>{marquee.text}</span>
      <span aria-hidden="true">✦</span>
      <span>{marquee.text}</span>
      <span aria-hidden="true">✦</span>
      <span>{marquee.text}</span>
    </span>
  );

  return (
    <aside
      aria-label="Site announcement"
      className="w-full overflow-hidden"
      style={{ backgroundColor: marquee.backgroundColor }}
    >
      {marquee.link ? (
        <Link
          href={marquee.link}
          className="block focus:outline-none focus:ring-2 focus:ring-white focus:ring-inset"
        >
          {content}
        </Link>
      ) : (
        content
      )}
    </aside>
  );
}
