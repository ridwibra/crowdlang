"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Mail, CheckCircle, XCircle } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import DotLoaderSpinner from "../shared/DotLoader";

type VerificationStatus =
  | "loading"
  | "verified"
  | "already_verified"
  | "failed";

export default function VerifyForm() {
  const [message, setMessage] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [status, setStatus] = useState<VerificationStatus>("loading");

  const router = useRouter();
  const params = useParams();

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        const token = params?.token as string;

        if (!token) {
          setMessage("Verification token is missing");
          setStatus("failed");
          setLoading(false);
          return;
        }

        const { data, error } = await authClient.verifyEmail({
          query: {
            token,
            callbackURL: "/",
          },
        });

        if (error) {
          if (error.message?.toLowerCase().includes("already")) {
            setStatus("already_verified");
            setMessage("This account is already verified. You can log in.");
          } else {
            setStatus("failed");
            throw new Error(error.message || "Verification failed");
          }
        } else {
          setStatus("verified");
          setMessage("Your email has been successfully verified!");
          setTimeout(() => router.push("/login"), 3000);
        }
      } catch (error) {
        setStatus("failed");
        setMessage(
          error instanceof Error ? error.message : "Verification failed",
        );
      } finally {
        setLoading(false);
      }
    };

    verifyEmail();
  }, [params?.token, router]);

  const isSuccess = status === "verified" || status === "already_verified";

  return (
    <div
      className="
        min-h-screen w-full 
        flex flex-col items-center 
        justify-center 
        px-4 py-2 
        bg-[#f7f9fc] 
        dark:bg-[#0f172a]
        relative
      "
    >
      {loading && <DotLoaderSpinner loading={loading} />}

      {/* Glow + Noise */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_center,rgba(0,200,255,0.12),transparent_70%)] pointer-events-none" />
      <div className="absolute inset-0 -z-10 bg-[url('/noise.png')] opacity-[0.04] mix-blend-overlay pointer-events-none" />

      {/* Logo */}
      <div className="mb-6 flex flex-col items-center z-10">
        <Image
          src="/images/logo.png"
          alt="CrowdLang Logo"
          width={120}
          height={120}
          className="opacity-95 drop-shadow-xl"
        />
        <p className="text-[#475569] dark:text-[#cbd5e1] text-xs tracking-[0.25em] mt-2 uppercase">
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
        {/* Status Icon */}
        <div className="flex justify-center mb-6">
          {loading ? (
            <div className="animate-pulse">
              <Mail className="w-16 h-16 text-teal-500 dark:text-teal-300" />
            </div>
          ) : isSuccess ? (
            <CheckCircle className="w-16 h-16 text-green-500 dark:text-green-400" />
          ) : (
            <XCircle className="w-16 h-16 text-red-500 dark:text-red-400" />
          )}
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-center text-[#1f2937] dark:text-white mb-6">
          Email Verification
        </h1>

        {/* Content */}
        {loading ? (
          <div className="space-y-4 text-center">
            <p className="text-[#64748b] dark:text-[#cbd5e1]">
              Verifying your email...
            </p>

            <div className="w-full bg-[#e2e8f0] dark:bg-[#334155] rounded-full h-2 overflow-hidden">
              <div
                className="bg-teal-500 dark:bg-teal-300 h-2 rounded-full"
                style={{ width: "70%" }}
              ></div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Message Alert */}
            <div
              className={`
                p-4 rounded-xl flex items-center gap-2 text-sm border
                ${
                  isSuccess
                    ? "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800"
                    : "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800"
                }
              `}
            >
              {isSuccess ? (
                <CheckCircle className="w-5 h-5 flex-shrink-0" />
              ) : (
                <XCircle className="w-5 h-5 flex-shrink-0" />
              )}
              <p>{message}</p>
            </div>

            {/* Actions */}
            <div className="space-y-4">
              {isSuccess ? (
                <Link
                  href="/login"
                  className="
                    block w-full px-6 py-3 
                    bg-gradient-to-r from-teal-400 to-cyan-500 
                    text-black font-semibold 
                    rounded-xl shadow-md 
                    hover:opacity-90 transition text-center
                  "
                >
                  {status === "already_verified"
                    ? "Proceed to Login"
                    : "Continue to Login"}
                </Link>
              ) : (
                <div className="space-y-4">
                  <Link
                    href="/register"
                    className="
                      block w-full px-6 py-3 
                      bg-[#f3f4f6] hover:bg-[#e2e8f0] 
                      dark:bg-[#1e293b] dark:hover:bg-[#334155] 
                      text-[#1f2937] dark:text-white 
                      font-medium rounded-xl 
                      shadow-sm hover:shadow-md 
                      transition text-center
                    "
                  >
                    Try Registering Again
                  </Link>

                  <div className="text-sm text-[#64748b] dark:text-[#cbd5e1] text-center">
                    Need help with verification?{" "}
                    <Link
                      href="/login"
                      className="
                        text-teal-600 dark:text-teal-300 
                        hover:underline font-medium
                      "
                    >
                      Login
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
