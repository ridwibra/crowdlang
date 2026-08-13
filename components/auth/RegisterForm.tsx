"use client";

import Image from "next/image";
import Link from "next/link";
import { ChangeEvent, FormEvent, useState } from "react";
import { Eye, EyeOff, X, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import dataURItoBlob from "@/utils/files/dataUrlToBlob";
import { uploadMedia } from "@/utils/files/requests";
import DotLoaderSpinner from "../shared/DotLoader";
import { authClient } from "@/lib/auth-client";

export default function RegisterPage() {
  // Form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMatch, setPasswordMatch] = useState(false);

  // Errors
  const [nameError, setNameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");

  // UI
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Avatar
  const [avatar, setAvatar] = useState<{
    url: string;
    size?: string;
    type?: string;
  } | null>(null);

  const handleAvatar = (event: ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || !event.target.files[0]) return;

    const file = event.target.files[0];
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (file.size > 5 * 1024 * 1024) {
      toast.error("The selected photo is larger than 5MB");
      return;
    }

    if (!allowedTypes.includes(file.type)) {
      toast.error("The selected photo must be JPG, PNG, or WEBP");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setAvatar({
          url: e.target.result as string,
          size: formatFileSize(file.size),
          type: file.type,
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} bytes`;
    else if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    else return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const handlePasswordChange = (e: ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    setPasswordMatch(e.target.value === confirmPassword);
  };

  const handleConfirmPasswordChange = (e: ChangeEvent<HTMLInputElement>) => {
    setConfirmPassword(e.target.value);
    setPasswordMatch(e.target.value === password);
  };

  const handleRemoveAvatar = () => setAvatar(null);

  const resetForm = () => {
    setName("");
    setEmail("");
    setBio("");
    setPassword("");
    setConfirmPassword("");
    setAvatar(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Clear previous errors
    setNameError("");
    setEmailError("");
    setPasswordError("");
    setConfirmPasswordError("");

    // Name validation
    const nameParts = name.trim().split(/\s+/).filter(Boolean);
    if (nameParts.length < 2) {
      setNameError("Please enter at least two names");
      toast.error("Please enter at least two names");
      return;
    }

    // Email validation
    if (!email) {
      setEmailError("Email is required");
      toast.error("Email is required");
      return;
    }

    // Password validation
    const passwordRegex =
      /^(?=.*\d)(?=.*[!@#$%^&*])(?=.*[a-z])(?=.*[A-Z]).{8,}$/;

    if (!passwordRegex.test(password)) {
      setPasswordError("Password does not meet requirements");
      toast.error("Password does not meet requirements");
      return;
    }

    // Confirm password validation
    if (password !== confirmPassword) {
      setConfirmPasswordError("Passwords do not match");
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      let uploaded_image: { image_url: string; public_id: string } | null =
        null;

      if (avatar?.url) {
        const blob = dataURItoBlob(avatar.url);
        if (!blob) throw new Error("Failed to process image");

        const file = new File([blob], "avatar", { type: blob.type });
        const uploadResponse = await uploadMedia(file, "avatars");

        uploaded_image = {
          image_url: uploadResponse[0].url,
          public_id: uploadResponse[0].public_id,
        };
      }

      const { data, error } = await authClient.signUp.email({
        name,
        email,
        password,
        image: uploaded_image?.image_url,
        bio,
        avatar: uploaded_image,
        callbackURL: "/dashboard",
      } as any);

      if (error) throw new Error(error.message || "Registration failed");

      toast.success("Welcome! Please check your email to verify your account.");
      resetForm();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Registration failed",
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
        px-4 py-2 
        bg-[#f7f9fc] 
        dark:bg-[#0f172a]
        relative
      "
    >
      {loading && <DotLoaderSpinner loading={loading} />}

      {/* Background */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_center,rgba(0,200,255,0.12),transparent_70%)] pointer-events-none" />
      <div className="absolute inset-0 -z-10 bg-[url('/noise.png')] opacity-[0.04] mix-blend-overlay pointer-events-none" />

      {/* Logo */}
      <div className="mb-1 -mt-6 flex flex-col items-center z-10">
        <div className="overflow-hidden leading-none flex items-center justify-center h-[160px]">
          <Image
            src="/images/logo.png"
            alt="CrowdLang Logo"
            width={200}
            height={200}
            className="object-cover opacity-95 drop-shadow-xl dark:invert"
          />
        </div>

        <p className="-mt-2 leading-none text-[#475569] dark:text-[#cbd5e1] text-xs tracking-[0.3em] uppercase">
          voices of the world
        </p>
      </div>

      {/* Card */}
      <div className="w-full max-w-3xl z-10">
        <div
          className="
            rounded-3xl 
            p-8 md:p-10 
            w-full 
            bg-white 
            dark:bg-[#1e293b]/80
            border border-[#e5e7eb] 
            dark:border-[#334155]
            shadow-xl
          "
        >
          <h1 className="text-2xl md:text-3xl font-semibold text-[#1f2937] dark:text-white mb-8 text-center tracking-wide">
            Create your account
          </h1>

          <form onSubmit={handleSubmit} className="space-y-7">
            {/* Avatar Upload */}
            <div>
              <label className="block text-sm font-medium text-[#1f2937] dark:text-[#e2e8f0] mb-2">
                Profile Picture
              </label>

              <div className="flex flex-wrap items-start gap-5">
                <div className="relative w-24 h-24">
                  {avatar ? (
                    <>
                      <Image
                        src={avatar.url}
                        alt="Profile preview"
                        fill
                        className="
                          rounded-full 
                          object-cover 
                          border-2 
                          border-[#e5e7eb] 
                          dark:border-[#334155]
                        "
                      />

                      <button
                        type="button"
                        onClick={handleRemoveAvatar}
                        className="
                          absolute -top-2 -right-2 
                          bg-red-500 text-white 
                          rounded-full p-1 
                          hover:bg-red-600 
                          transition
                        "
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </>
                  ) : (
                    <div
                      className="
                        w-full h-full 
                        rounded-full 
                        border-2 border-dashed 
                        border-[#e5e7eb] dark:border-[#334155] 
                        bg-[#f3f4f6] dark:bg-[#1e293b] 
                        flex items-center justify-center
                      "
                    >
                      <span className="text-[#64748b] dark:text-[#94a3b8] text-xs">
                        No image
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-[200px]">
                  <label
                    className="
                      inline-flex items-center gap-2 
                      px-4 py-2.5 
                      text-sm font-semibold 
                      rounded-xl 
                      border border-[#e5e7eb] dark:border-[#334155] 
                      bg-[#f3f4f6] dark:bg-[#1e293b] 
                      text-[#1f2937] dark:text-white 
                      hover:bg-[#e2e8f0] dark:hover:bg-[#334155] 
                      transition cursor-pointer
                    "
                  >
                    {avatar ? "Change Image" : "Upload Image"}
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleAvatar}
                    />
                  </label>

                  {avatar?.size && (
                    <p className="mt-2 text-xs text-[#64748b] dark:text-[#94a3b8]">
                      Size: {avatar.size}
                    </p>
                  )}

                  {avatar?.type && (
                    <p className="text-xs text-[#64748b] dark:text-[#94a3b8]">
                      Type: {avatar.type}
                    </p>
                  )}

                  <p className="mt-1 text-xs text-[#64748b] dark:text-[#94a3b8]">
                    JPG, PNG or WEBP (max 5MB)
                  </p>
                </div>
              </div>
            </div>

            {/* Name */}
            <div>
              <input
                type="text"
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`
                  w-full px-4 py-3.5 rounded-xl
                  bg-[#f3f4f6] dark:bg-[#1e293b]
                  text-[#1f2937] dark:text-white
                  placeholder-[#94a3b8]
                  focus:outline-none focus:ring-2
                  border
                  ${
                    nameError
                      ? "border-red-500 focus:ring-red-500"
                      : "border-[#e5e7eb] dark:border-[#334155] focus:ring-teal-500"
                  }
                `}
              />
              {nameError && (
                <p className="text-red-600 dark:text-red-400 text-sm mt-1">
                  {nameError}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`
                  w-full px-4 py-3.5 rounded-xl
                  bg-[#f3f4f6] dark:bg-[#1e293b]
                  text-[#1f2937] dark:text-white
                  placeholder-[#94a3b8]
                  focus:outline-none focus:ring-2
                  border
                  ${
                    emailError
                      ? "border-red-500 focus:ring-red-500"
                      : "border-[#e5e7eb] dark:border-[#334155] focus:ring-teal-500"
                  }
                `}
              />
              {emailError && (
                <p className="text-red-600 dark:text-red-400 text-sm mt-1">
                  {emailError}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-[#1f2937] dark:text-[#e2e8f0] mb-2">
                Password <span className="text-red-500">*</span>
              </label>

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={handlePasswordChange}
                  placeholder="••••••••"
                  className={`
                    w-full px-4 py-3.5 rounded-xl
                    bg-[#f3f4f6] dark:bg-[#1e293b]
                    text-[#1f2937] dark:text-white
                    placeholder-[#94a3b8]
                    focus:outline-none focus:ring-2 pr-11
                    border
                    ${
                      passwordError
                        ? "border-red-500 focus:ring-red-500"
                        : "border-[#e5e7eb] dark:border-[#334155] focus:ring-teal-500"
                    }
                  `}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748b] dark:text-[#94a3b8] hover:text-[#1f2937] dark:hover:text-white transition"
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </button>
              </div>

              {passwordError && (
                <p className="text-red-600 dark:text-red-400 text-sm mt-1">
                  {passwordError}
                </p>
              )}

              {password && (
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  {[
                    password.length >= 8,
                    /\d/.test(password),
                    /[!@#$%^&*]/.test(password),
                    /[a-z]/.test(password),
                    /[A-Z]/.test(password),
                  ].map((valid, i) => (
                    <span
                      key={i}
                      className={`flex items-center ${
                        valid
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {valid ? (
                        <CheckCircle className="mr-1" />
                      ) : (
                        <XCircle className="mr-1" />
                      )}
                      {
                        [
                          "8+ chars",
                          "Number",
                          "Special",
                          "Lowercase",
                          "Uppercase",
                        ][i]
                      }
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-[#1f2937] dark:text-[#e2e8f0] mb-2">
                Confirm Password <span className="text-red-500">*</span>
              </label>

              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={handleConfirmPasswordChange}
                  placeholder="••••••••"
                  className={`
                    w-full px-4 py-3.5 rounded-xl
                    bg-[#f3f4f6] dark:bg-[#1e293b]
                    text-[#1f2937] dark:text-white
                    placeholder-[#94a3b8]
                    focus:outline-none focus:ring-2 pr-11
                    border
                    ${
                      confirmPasswordError
                        ? "border-red-500 focus:ring-red-500"
                        : "border-[#e5e7eb] dark:border-[#334155] focus:ring-teal-500"
                    }
                  `}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748b] dark:text-[#94a3b8] hover:text-[#1f2937] dark:hover:text-white transition"
                >
                  {showConfirmPassword ? <EyeOff /> : <Eye />}
                </button>
              </div>

              {confirmPasswordError && (
                <p className="text-red-600 dark:text-red-400 text-sm mt-1">
                  {confirmPasswordError}
                </p>
              )}

              {confirmPassword && (
                <div
                  className={`mt-3 flex items-center text-sm ${
                    passwordMatch
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {passwordMatch ? (
                    <CheckCircle className="mr-1" />
                  ) : (
                    <XCircle className="mr-1" />
                  )}
                  {passwordMatch ? "Passwords match" : "Passwords don't match"}
                </div>
              )}
            </div>

            {/* Bio */}
            <div>
              <label className="block text-sm font-medium text-[#1f2937] dark:text-[#e2e8f0] mb-2">
                Bio
              </label>
              <textarea
                rows={4}
                placeholder="Tell us a little about yourself..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="
                  w-full px-4 py-3.5 rounded-xl
                  bg-[#f3f4f6] dark:bg-[#1e293b]
                  border border-[#e5e7eb] dark:border-[#334155]
                  text-[#1f2937] dark:text-white
                  placeholder-[#94a3b8]
                  focus:outline-none focus:ring-2 focus:ring-teal-500
                  resize-none
                "
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="
                w-full py-3.5 rounded-xl 
                bg-gradient-to-r from-teal-400 to-cyan-500 
                text-black font-semibold 
                shadow-lg 
                hover:opacity-90 
                transition 
                text-base md:text-lg 
                disabled:opacity-50
              "
            >
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <p className="text-center text-[#475569] dark:text-[#cbd5e1] mt-6 text-sm">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-teal-600 dark:text-teal-300 hover:underline"
            >
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
