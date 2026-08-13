"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function UnauthorizedComponent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const message = searchParams.get("message");

  // useEffect(() => {
  //   const timeout = setTimeout(() => {
  //     router.replace("/");
  //   }, 5000);

  //   return () => clearTimeout(timeout);
  // }, [router]);

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-screen-md items-center justify-center px-4 sm:px-6 lg:px-8">
      <div
        className="w-full rounded-lg border border-gray-200 bg-white p-6 text-center shadow-sm 
                      dark:border-gray-700 dark:bg-gray-900"
      >
        <h1 className="text-2xl font-semibold text-red-600 dark:text-red-400">
          Access Denied
        </h1>

        {message && (
          <div
            className="mt-3 rounded-md bg-red-50 px-4 py-3 text-sm text-red-600 
                          dark:bg-red-900/30 dark:text-red-300"
          >
            {message}
          </div>
        )}

        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          You do not have permission to view this page.
        </p>

        <button
          onClick={() => router.push("/")}
          className="mt-6 rounded-md bg-black px-4 py-2 text-sm text-white hover:bg-gray-900 
                     dark:bg-gray-700 dark:hover:bg-gray-600"
        >
          Go Home
        </button>
      </div>
    </div>
  );
}
