"use client";

import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export default function AutoLogout() {
  const router = useRouter();

  const inactivityLimit = 30 * 60 * 1000; // 30 minutes
  const warningTime = 5 * 60 * 1000; // 5 minutes before logout

  // // CONFIG
  // const inactivityLimit = 1 * 60 * 1000; // 1 minute
  // const warningTime = 20 * 1000; // last 20 seconds

  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  function formatCountdown(seconds: number) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  useEffect(() => {
    // Check session first
    authClient.getSession().then((session) => {
      const loggedIn = Boolean(session?.data?.user);
      setIsLoggedIn(loggedIn);
    });
  }, []);

  // ⭐ Do NOT run timers if user is not logged in
  useEffect(() => {
    if (!isLoggedIn) return;

    let inactivityTimer: NodeJS.Timeout;
    let warningTimer: NodeJS.Timeout;
    let countdownInterval: NodeJS.Timeout;

    const resetTimers = () => {
      setShowWarning(false);
      setCountdown(0);

      clearTimeout(inactivityTimer);
      clearTimeout(warningTimer);
      clearInterval(countdownInterval);

      warningTimer = setTimeout(() => {
        setShowWarning(true);

        let remaining = warningTime / 1000;
        setCountdown(remaining);

        countdownInterval = setInterval(() => {
          remaining -= 1;
          setCountdown(remaining);

          if (remaining <= 0) clearInterval(countdownInterval);
        }, 1000);
      }, inactivityLimit - warningTime);

      inactivityTimer = setTimeout(async () => {
        const session = await authClient.getSession();
        const email = session?.data?.user?.email;

        if (email) {
          await fetch("/api/activity/logout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
          });
        }

        await authClient.signOut();
        router.push("/login");
      }, inactivityLimit);
    };

    const events = ["mousemove", "keydown", "click", "scroll"];
    events.forEach((event) => window.addEventListener(event, resetTimers));

    resetTimers();

    return () => {
      clearTimeout(inactivityTimer);
      clearTimeout(warningTimer);
      clearInterval(countdownInterval);
      events.forEach((event) => window.removeEventListener(event, resetTimers));
    };
  }, [isLoggedIn]);

  // ⭐ If not logged in, render nothing
  if (!isLoggedIn) return null;

  return (
    <>
      {showWarning && (
        <div
          className="
          fixed inset-0 z-50 
          bg-black/40 dark:bg-black/60 
          backdrop-blur-sm 
          flex items-center justify-center 
          p-4 sm:p-6 md:p-8
        "
        >
          <div
            className="
            bg-white dark:bg-gray-900 
            text-gray-900 dark:text-gray-100
            w-full max-w-xs sm:max-w-sm md:max-w-md 
            p-6 sm:p-7 md:p-8 
            rounded-xl shadow-2xl 
            border border-gray-200 dark:border-gray-700
            animate-[fadeIn_0.3s_ease-out]
          "
          >
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-4 text-center">
              Inactivity Warning
            </h2>

            <p className="text-sm sm:text-base md:text-lg text-center mb-4">
              You will be logged out in{" "}
              <span className="font-bold text-red-600 dark:text-red-400">
                {formatCountdown(countdown)}
              </span>{" "}
              due to inactivity.
            </p>

            <p className="text-xs sm:text-sm md:text-base text-center text-gray-600 dark:text-gray-400">
              Move your mouse or press any key to stay logged in.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
