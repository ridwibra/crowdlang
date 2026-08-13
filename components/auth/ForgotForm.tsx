"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import DotLoaderSpinner from "../shared/DotLoader";
import { authClient } from "@/lib/auth-client";

export default function ForgotForm() {
  const [loading, setLoading] = useState(false);
  const [forgotError, setForgotError] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState("");
  const [email, setEmail] = useState("");

  const isValidEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear previous errors
    setForgotError("");
    setForgotSuccess("");

    if (!isValidEmail(email)) {
      setForgotError("Please enter a valid email");
      return;
    }

    try {
      setLoading(true);

      const { error } = await authClient.requestPasswordReset({
        email,
        redirectTo: `${window.location.origin}/reset`,
      });

      if (error) {
        setForgotError(error.message ?? "Something went wrong");
      } else {
        setForgotSuccess("Check your email for a reset link!");
      }
    } catch (error) {
      setForgotError(
        error instanceof Error ? error.message : "An error occurred",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="
        min-h-screen w-full 
        flex flex-col items-center 
        justify-center 
        px-4 py-10 
        bg-[#f7f9fc] 
        dark:bg-[#0f172a]
        relative
      "
    >
      {/* Glow + Noise */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_center,rgba(0,200,255,0.12),transparent_70%)] pointer-events-none" />
      <div className="absolute inset-0 -z-10 bg-[url('/noise.png')] opacity-[0.04] mix-blend-overlay pointer-events-none" />

      {/* Logo */}
      <div className="mb-6 flex flex-col items-center z-10">
        <div className="overflow-hidden leading-none flex items-center justify-center h-[140px]">
          <Image
            src="/images/logo.png"
            alt="CrowdLang Logo"
            width={120}
            height={120}
            className="object-cover opacity-95 drop-shadow-xl dark:invert"
          />
        </div>

        <p className="text-[#475569] dark:text-[#cbd5e1] text-xs tracking-[0.25em] mt-1 uppercase leading-none">
          voices of the world
        </p>
      </div>

      {/* Card */}
      <div
        className="
          w-full max-w-md 
          bg-white 
          dark:bg-[#1e293b]/80 
          border border-[#e5e7eb] dark:border-[#334155] 
          shadow-xl 
          rounded-3xl 
          p-8 
          z-10
        "
      >
        {loading && <DotLoaderSpinner loading={loading} />}

        {/* Header */}
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-[#1f2937] dark:text-white">
            Reset Password
          </h1>
          <p className="mt-2 text-[#64748b] dark:text-[#cbd5e1] text-sm">
            Enter your email and we’ll send you a reset link
          </p>
        </div>

        {/* Back Link */}
        <div className="mb-6">
          <Link
            href="/login"
            className="
              inline-flex items-center gap-1 
              text-teal-600 dark:text-teal-300 
              hover:underline text-sm font-medium
            "
          >
            <ArrowLeft className="w-5 h-5" />
            Back to login
          </Link>
        </div>

        {/* Form */}
        <form onSubmit={onSubmit} className="space-y-5">
          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-semibold text-[#1f2937] dark:text-[#e2e8f0] mb-1"
            >
              Email Address*
            </label>

            <input
              id="email"
              type="email"
              value={email}
              required
              placeholder="you@example.com"
              onChange={(e) => setEmail(e.target.value)}
              className={`
                w-full px-4 py-3 rounded-xl 
                bg-[#f3f4f6] dark:bg-[#1e293b] 
                text-[#1f2937] dark:text-white 
                placeholder-[#94a3b8]
                outline-none transition-all
                border
                ${
                  forgotError
                    ? "border-red-500 focus:ring-red-500"
                    : "border-[#e5e7eb] dark:border-[#334155] focus:ring-teal-500"
                }
                focus:ring-2
              `}
            />

            {forgotError && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {forgotError}
              </p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="
              w-full py-3 rounded-xl 
              text-black text-base font-semibold 
              flex items-center justify-center 
              transition-all duration-200
              bg-gradient-to-r from-teal-400 to-cyan-500
              hover:opacity-90
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            {loading ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-black"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Sending...
              </>
            ) : (
              "Send Reset Link"
            )}
          </button>

          {/* Success */}
          {forgotSuccess && (
            <div
              className="
              p-3 rounded-lg 
              bg-green-50 dark:bg-green-900/30 
              text-green-700 dark:text-green-300 
              border border-green-200 dark:border-green-800 
              text-sm
            "
            >
              {forgotSuccess}
            </div>
          )}
        </form>

        {/* Register */}
        <div className="mt-6 text-center text-sm text-[#64748b] dark:text-[#cbd5e1]">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="text-teal-600 dark:text-teal-300 hover:underline font-medium"
          >
            Register
          </Link>
        </div>
      </div>
    </div>
  );
}
