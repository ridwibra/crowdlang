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
  const [marquees, setMarquees] = useState<MarqueeData[]>([]);

  useEffect(() => {
    async function loadMarquees() {
      try {
        const response = await fetch("/api/marquee", {
          cache: "no-store",
        });

        if (!response.ok) return;

        const data = await response.json();

        const activeMarquees: MarqueeData[] = (data.marquees || []).filter(
          (item: MarqueeData) => item.isActive,
        );

        setMarquees(activeMarquees);
      } catch (error) {
        console.error("Could not load marquees:", error);
      }
    }

    loadMarquees();
  }, []);

  if (marquees.length === 0) return null;

  // Use the first active marquee's speed for the shared scrolling track.
  const speed = marquees[0].speed;

  return (
    <aside
      aria-label="Site announcements"
      className="w-full overflow-hidden"
      style={{
        backgroundColor: marquees[0].backgroundColor,
      }}
    >
      <div
        className="marquee-track inline-flex min-w-max items-center"
        style={{
          animationDuration: `${speed}s`,
        }}
      >
        {[0, 1].map((copy) => (
          <div
            key={copy}
            className="inline-flex shrink-0 items-center"
            aria-hidden={copy === 1}
          >
            {marquees.map((marquee) => {
              const content = (
                <span
                  className="inline-flex shrink-0 items-center gap-4 px-6 py-2 text-sm font-semibold"
                  style={{ color: marquee.textColor }}
                >
                  <span>{marquee.text}</span>
                  <span aria-hidden="true">✦</span>
                </span>
              );

              return marquee.link ? (
                <Link
                  key={marquee._id}
                  href={marquee.link}
                  className="shrink-0"
                >
                  {content}
                </Link>
              ) : (
                <span key={marquee._id} className="shrink-0">
                  {content}
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </aside>
  );
}
