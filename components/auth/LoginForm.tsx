"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import DotLoaderSpinner from "../shared/DotLoader";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

const SOCIAL_PROVIDERS = ["google", "facebook", "github", "microsoft"] as const;

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [loginError, setLoginError] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const trackLogin = async (userEmail: string) => {
    const response = await fetch("/api/activity/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: userEmail.trim(),
      }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok || !data?.ok) {
      throw new Error(data?.message || "Failed to record login activity.");
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setEmailError("");
    setPasswordError("");
    setLoginError("");

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setEmailError("Email is required.");
      return;
    }

    if (!password) {
      setPasswordError("Password is required.");
      return;
    }

    setLoading(true);

    try {
      const result = await authClient.signIn.email({
        email: normalizedEmail,
        password,
        callbackURL: "/",
      });

      if (result.error) {
        setLoginError(result.error.message || "Invalid login credentials.");
        return;
      }

      /*
       * The login itself has succeeded. Use the form email directly rather than
       * depending only on an immediate second getSession() request.
       */
      await trackLogin(normalizedEmail);

      router.refresh();
      router.push("/");
    } catch (error) {
      setLoginError(
        error instanceof Error
          ? error.message
          : "Login failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (
    provider: (typeof SOCIAL_PROVIDERS)[number],
  ) => {
    try {
      setLoginError("");
      setLoading(true);

      /*
       * Social providers redirect away from this page. Activity tracking for
       * social login must ultimately be handled server-side after the OAuth
       * callback creates the session.
       */
      const result = await authClient.signIn.social({
        provider,
        callbackURL: "/",
      });

      if (result.error) {
        throw new Error(
          result.error.message || `Failed to sign in with ${provider}.`,
        );
      }
    } catch (error) {
      setLoginError(
        error instanceof Error
          ? error.message
          : "Social login failed. Please try again.",
      );
      setLoading(false);
    }
  };

  return (
    <div
      className="
        relative flex min-h-screen w-full flex-col items-center justify-center
        bg-gradient-to-br from-[#f7f9fc] to-[#eef2f7] px-2 py-2
        dark:from-[#0f172a] dark:to-[#1e293b]
      "
    >
      {loading && <DotLoaderSpinner loading={loading} />}

      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_center,rgba(0,200,255,0.10),transparent_70%)]" />

      <div className="pointer-events-none absolute inset-0 -z-10 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay" />

      <div className="z-10 mb-1 -mt-6 flex flex-col items-center">
        <div className="flex h-[160px] items-center justify-center overflow-hidden leading-none">
          <Image
            src="/images/logo.png"
            alt="CrowdLang Logo"
            width={200}
            height={200}
            priority
            className="object-cover opacity-95 drop-shadow-xl dark:invert"
          />
        </div>

        <p className="-mt-2 text-xs uppercase leading-none tracking-[0.3em] text-[#475569] dark:text-[#cbd5e1]">
          voices of the world
        </p>
      </div>

      <div
        className="
          w-full max-w-md rounded-3xl border border-gray-200 bg-white p-8
          shadow-2xl backdrop-blur-sm
          animate-[fadeIn_0.4s_ease]
          dark:border-gray-700 dark:bg-[#1e293b]/80
        "
      >
        <h1 className="mb-6 text-center text-4xl font-bold text-gray-900 dark:text-white">
          Welcome Back
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Email Address*
            </label>

            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setEmailError("");
              }}
              placeholder="you@example.com"
              className={`
                w-full rounded-xl border px-4 py-3
                bg-gray-100 text-gray-900 placeholder-gray-400
                focus:outline-none focus:ring-2
                dark:bg-[#1e293b] dark:text-white
                ${
                  emailError
                    ? "border-red-500 focus:ring-red-500"
                    : "border-gray-300 focus:ring-teal-500 dark:border-gray-600"
                }
              `}
            />

            {emailError && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {emailError}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Password*
            </label>

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setPasswordError("");
                }}
                placeholder="••••••••"
                className={`
                  w-full rounded-xl border px-4 py-3 pr-10
                  bg-gray-100 text-gray-900 placeholder-gray-400
                  focus:outline-none focus:ring-2
                  dark:bg-[#1e293b] dark:text-white
                  ${
                    passwordError
                      ? "border-red-500 focus:ring-red-500"
                      : "border-gray-300 focus:ring-teal-500 dark:border-gray-600"
                  }
                `}
              />

              <button
                type="button"
                onClick={() => setShowPassword((previous) => !previous)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="
                  absolute right-3 top-1/2 -translate-y-1/2
                  text-gray-500 transition hover:text-gray-700
                  dark:text-gray-400 dark:hover:text-white
                "
              >
                {showPassword ? <EyeOff /> : <Eye />}
              </button>
            </div>

            {passwordError && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {passwordError}
              </p>
            )}
          </div>

          <div className="flex justify-end">
            <Link
              href="/forgot"
              className="text-sm font-medium text-teal-600 hover:underline dark:text-teal-300"
            >
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="
              flex w-full items-center justify-center rounded-xl
              bg-gradient-to-r from-teal-400 to-cyan-500 py-3
              text-base font-semibold text-black
              transition-all duration-200 hover:opacity-90
              disabled:cursor-not-allowed disabled:opacity-50
            "
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>

          {loginError && (
            <div
              className="
                rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700
                dark:border-red-800 dark:bg-red-900/30 dark:text-red-300
              "
            >
              {loginError}
            </div>
          )}

          <div className="mt-8">
            <p className="mb-4 text-center tracking-wide text-gray-600 dark:text-gray-300">
              or continue with
            </p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {SOCIAL_PROVIDERS.map((provider) => (
                <button
                  key={provider}
                  type="button"
                  disabled={loading}
                  onClick={() => handleSocialLogin(provider)}
                  className="
        rounded-xl border border-gray-300 bg-gray-100 py-2.5
        text-sm font-medium text-gray-900 transition
        hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50
        dark:border-gray-600 dark:bg-[#1e293b] dark:text-white
        dark:hover:bg-[#334155]
      "
                >
                  {provider === "microsoft"
                    ? "Microsoft"
                    : provider.charAt(0).toUpperCase() + provider.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-300">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="font-medium text-teal-600 hover:underline dark:text-teal-300"
            >
              Register
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
