"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

const INACTIVITY_LIMIT = 30 * 60 * 1000; // 30 minutes
const WARNING_TIME = 5 * 60 * 1000; // Show warning during final 5 minutes

// const INACTIVITY_LIMIT = 60 * 1000; // 1 minute seconds
// const WARNING_TIME = 10 * 1000; // Show warning during final 20 seconds

export default function AutoLogout() {
  const router = useRouter();

  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const lastActivityRef = useRef(Date.now());
  const isLoggingOutRef = useRef(false);

  const clearTimers = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }

    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current);
      warningTimerRef.current = null;
    }

    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;

    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const logOut = useCallback(async () => {
    if (isLoggingOutRef.current) return;

    isLoggingOutRef.current = true;
    clearTimers();
    setShowWarning(false);
    setCountdown(0);

    try {
      const session = await authClient.getSession();
      const email = session?.data?.user?.email;

      if (email) {
        await fetch("/api/activity/logout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email }),
          keepalive: true,
        }).catch(() => undefined);
      }

      await authClient.signOut();
    } finally {
      setIsLoggedIn(false);
      router.replace("/login");
    }
  }, [clearTimers, router]);

  const showInactivityWarning = useCallback(() => {
    if (isLoggingOutRef.current) return;

    const elapsed = Date.now() - lastActivityRef.current;
    const remainingMilliseconds = INACTIVITY_LIMIT - elapsed;

    if (remainingMilliseconds <= 0) {
      void logOut();
      return;
    }

    const remainingSeconds = Math.max(
      0,
      Math.ceil(remainingMilliseconds / 1000),
    );

    setShowWarning(true);
    setCountdown(remainingSeconds);

    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }

    countdownIntervalRef.current = setInterval(() => {
      const currentElapsed = Date.now() - lastActivityRef.current;
      const currentRemainingMilliseconds = INACTIVITY_LIMIT - currentElapsed;

      if (currentRemainingMilliseconds <= 0) {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }

        void logOut();
        return;
      }

      setCountdown(Math.ceil(currentRemainingMilliseconds / 1000));
    }, 1000);
  }, [logOut]);

  const scheduleTimers = useCallback(() => {
    clearTimers();

    if (isLoggingOutRef.current) return;

    const elapsed = Date.now() - lastActivityRef.current;
    const remainingUntilWarning = INACTIVITY_LIMIT - WARNING_TIME - elapsed;
    const remainingUntilLogout = INACTIVITY_LIMIT - elapsed;

    if (remainingUntilLogout <= 0) {
      void logOut();
      return;
    }

    if (remainingUntilWarning <= 0) {
      showInactivityWarning();
    } else {
      warningTimerRef.current = setTimeout(
        showInactivityWarning,
        remainingUntilWarning,
      );
    }

    inactivityTimerRef.current = setTimeout(() => {
      void logOut();
    }, remainingUntilLogout);
  }, [clearTimers, logOut, showInactivityWarning]);

  const recordActivity = useCallback(() => {
    if (isLoggingOutRef.current) return;

    lastActivityRef.current = Date.now();
    setShowWarning(false);
    setCountdown(0);
    scheduleTimers();
  }, [scheduleTimers]);

  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      const session = await authClient.getSession();

      if (!mounted) return;

      const loggedIn = Boolean(session?.data?.user);
      isLoggingOutRef.current = false;
      lastActivityRef.current = Date.now();
      setIsLoggedIn(loggedIn);
    };

    void checkSession();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;

    const events: Array<keyof WindowEventMap> = [
      "mousemove",
      "mousedown",
      "keydown",
      "touchstart",
      "scroll",
      "click",
    ];

    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;

      const elapsed = Date.now() - lastActivityRef.current;

      /*
       * On wake/focus, do not call recordActivity().
       * Returning to the tab is not treated as user activity, so someone
       * cannot avoid auto logout simply by reopening an inactive screen.
       */
      if (elapsed >= INACTIVITY_LIMIT) {
        void logOut();
        return;
      }

      scheduleTimers();
    };

    events.forEach((event) => {
      window.addEventListener(event, recordActivity, { passive: true });
    });

    document.addEventListener("visibilitychange", handleVisibilityChange);

    scheduleTimers();

    return () => {
      clearTimers();

      events.forEach((event) => {
        window.removeEventListener(event, recordActivity);
      });

      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [clearTimers, isLoggedIn, logOut, recordActivity, scheduleTimers]);

  if (!isLoggedIn) return null;

  return (
    <>
      {showWarning && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="inactivity-warning-title"
          className="
            fixed inset-0 z-50 flex items-center justify-center
            bg-black/40 p-4 backdrop-blur-sm
            dark:bg-black/60 sm:p-6 md:p-8
          "
        >
          <div
            className="
              w-full max-w-xs rounded-xl border border-gray-200
              bg-white p-6 text-gray-900 shadow-2xl
              animate-[fadeIn_0.3s_ease-out]
              dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100
              sm:max-w-sm sm:p-7 md:max-w-md md:p-8
            "
          >
            <h2
              id="inactivity-warning-title"
              className="mb-4 text-center text-lg font-bold sm:text-xl md:text-2xl"
            >
              Inactivity Warning
            </h2>

            <p className="mb-4 text-center text-sm sm:text-base md:text-lg">
              You will be logged out in{" "}
              <span className="font-bold text-red-600 dark:text-red-400">
                {formatCountdown(countdown)}
              </span>{" "}
              due to inactivity.
            </p>

            <p className="text-center text-xs text-gray-600 dark:text-gray-400 sm:text-sm md:text-base">
              Move your mouse, scroll, tap, or press any key to stay logged in.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
