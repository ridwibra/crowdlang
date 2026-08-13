"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export default function PageTracker() {
  const pathname = usePathname();
  const startTimeRef = useRef<number>(Date.now());

  // Ensure sessionId exists
  useEffect(() => {
    if (!localStorage.getItem("sessionId")) {
      localStorage.setItem("sessionId", crypto.randomUUID());
    }
  }, []);

  useEffect(() => {
    startTimeRef.current = Date.now();

    return () => {
      const endTime = Date.now();
      const durationInSeconds = Math.floor(
        (endTime - startTimeRef.current) / 1000,
      );

      if (durationInSeconds > 1) {
        const payload = {
          sessionId: localStorage.getItem("sessionId"),
          actionType: "page_view",
          pathname,
          duration: durationInSeconds,
          startTime: new Date(startTimeRef.current),
          endTime: new Date(endTime),
        };

        const body = JSON.stringify(payload);

        if (navigator.sendBeacon) {
          navigator.sendBeacon("/api/tracker", body);
        } else {
          fetch("/api/tracker", {
            method: "POST",
            body,
            keepalive: true,
          });
        }
      }
    };
  }, [pathname]);

  return null;
}
