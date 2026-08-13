"use client";

import { useEffect, useState, ChangeEvent, FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Save, Upload, Trash2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { deleteMedia, uploadMedia } from "@/utils/files/requests";
import DotLoaderSpinner from "@/components/shared/DotLoader";
import { UserType } from "@/utils/types";

type AvatarData = {
  image_url: string;
  public_id: string | null;
} | null;

type PreviewState = {
  url: string;
  size: string;
  type: string;
  file: File;
} | null;

export default function EditProfileForm() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const user = session?.user as (UserType & { id: string }) | undefined;

  // Fields
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [currentAvatar, setCurrentAvatar] = useState<AvatarData>(null);
  const [preview, setPreview] = useState<PreviewState>(null);

  // Errors
  const [nameError, setNameError] = useState("");
  const [bioError, setBioError] = useState("");
  const [avatarError, setAvatarError] = useState("");

  // UI
  const [loading, setLoading] = useState(false);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [oldPublicId, setOldPublicId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    setName(user.name || "");
    setBio(user.bio || "");
    setCurrentAvatar(user.avatar ?? null);
    setRemoveAvatar(false);
    setPreview(null);
  }, [user]);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} bytes`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    // Clear previous avatar errors
    setAvatarError("");

    if (file.size > 5 * 1024 * 1024) {
      setAvatarError("Image must be under 5MB");
      toast.error("The selected photo is larger than 5MB");
      return;
    }

    if (!allowedTypes.includes(file.type)) {
      setAvatarError("Image must be JPG, PNG, or WEBP");
      toast.error("The selected photo must be JPG, PNG, or WEBP");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      if (!e.target?.result) return;

      setPreview({
        url: e.target.result as string,
        size: formatFileSize(file.size),
        type: file.type,
        file,
      });
      setRemoveAvatar(false);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setPreview(null);
    setOldPublicId(currentAvatar?.public_id || null);
    setCurrentAvatar(null);
    setRemoveAvatar(true);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Clear previous errors
    setNameError("");
    setBioError("");
    setAvatarError("");

    // Name validation
    const nameParts = name.trim().split(/\s+/).filter(Boolean);
    if (nameParts.length < 2) {
      setNameError("Please enter at least two names");
      toast.error("Please enter at least two names");
      return;
    }

    // Bio validation (optional)
    if (bio.length > 1000) {
      setBioError("Bio must be under 1000 characters");
      toast.error("Bio must be under 1000 characters");
      return;
    }

    // Avatar validation
    if (preview?.file && preview.file.size > 5 * 1024 * 1024) {
      setAvatarError("Image must be under 5MB");
      toast.error("Image must be under 5MB");
      return;
    }

    setLoading(true);

    try {
      let nextAvatar: AvatarData = currentAvatar;

      if (removeAvatar) {
        nextAvatar = null;
      }

      if (preview?.file) {
        const uploadResponse = await uploadMedia(preview.file, "avatars");
        const uploaded = uploadResponse[0];

        if (!uploaded?.url) {
          throw new Error("Upload failed");
        }

        nextAvatar = {
          image_url: uploaded.url,
          public_id: uploaded.public_id ?? null,
        };
      }

      const { error } = await authClient.updateUser({
        name,
        bio,
        avatar: nextAvatar,
        image: nextAvatar?.image_url ?? null,
      } as any);

      if (error) throw new Error(error.message || "Update failed");

      if (removeAvatar && oldPublicId) {
        try {
          await deleteMedia(oldPublicId);
        } catch {
          console.warn("Failed to delete old avatar:", oldPublicId);
        }
      }

      if (
        preview?.file &&
        currentAvatar?.public_id &&
        currentAvatar.public_id !== nextAvatar?.public_id
      ) {
        try {
          await deleteMedia(currentAvatar.public_id);
        } catch {
          console.warn("Failed to delete old avatar:", currentAvatar.public_id);
        }
      }

      setCurrentAvatar(nextAvatar);
      setPreview(null);
      setRemoveAvatar(false);

      toast.success("Profile updated successfully");
      router.push("/profile");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setLoading(false);
    }
  };

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 text-center text-gray-600 dark:text-gray-300">
        Loading...
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 text-center text-gray-600 dark:text-gray-300">
        Not Signed In
      </div>
    );
  }

  const previewSrc =
    preview?.url || currentAvatar?.image_url || "/images/default-avatar.png";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 px-4 py-6 pt-24 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/profile"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Profile
        </Link>

        <div className="rounded-3xl border border-white/50 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-900/70 sm:p-8">
          <div className="mb-6">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-600 dark:text-teal-400">
              Account Settings
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
              Edit Profile
            </h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Update your name, bio, and profile photo.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`
                  w-full rounded-xl px-4 py-3
                  bg-slate-50 dark:bg-slate-800
                  text-slate-900 dark:text-white
                  placeholder-slate-400
                  outline-none transition
                  border
                  ${
                    nameError
                      ? "border-red-500 focus:ring-red-500"
                      : "border-slate-200 dark:border-slate-700 focus:ring-teal-500"
                  }
                `}
                placeholder="Your full name"
              />
              {nameError && (
                <p className="text-red-600 dark:text-red-400 text-sm mt-1">
                  {nameError}
                </p>
              )}
            </div>

            {/* Bio */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                Bio
              </label>
              <textarea
                rows={4}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className={`
                  w-full rounded-xl px-4 py-3
                  bg-slate-50 dark:bg-slate-800
                  text-slate-900 dark:text-white
                  placeholder-slate-400
                  outline-none transition resize-none
                  border
                  ${
                    bioError
                      ? "border-red-500 focus:ring-red-500"
                      : "border-slate-200 dark:border-slate-700 focus:ring-teal-500"
                  }
                `}
                placeholder="Tell people a little about yourself..."
              />
              {bioError && (
                <p className="text-red-600 dark:text-red-400 text-sm mt-1">
                  {bioError}
                </p>
              )}
            </div>

            {/* Avatar */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                Profile Picture
              </label>

              <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                <div
                  className={`
                    relative mx-auto h-28 w-28 overflow-hidden rounded-full border-4 shadow-lg sm:mx-0
                    ${avatarError ? "border-red-500" : "border-teal-400"}
                  `}
                >
                  <Image
                    src={previewSrc}
                    alt="Profile preview"
                    fill
                    className="object-cover"
                  />
                </div>

                <div className="flex-1 space-y-3">
                  <div className="flex flex-wrap gap-3">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-teal-500 dark:hover:bg-teal-600">
                      <Upload className="h-4 w-4" />
                      {preview ? "Change Image" : "Upload Image"}
                      <input
                        type="file"
                        className="hidden"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={handleAvatarChange}
                      />
                    </label>

                    {(preview || currentAvatar?.image_url) && (
                      <button
                        type="button"
                        onClick={handleRemoveAvatar}
                        className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-100 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
                    <p>JPG, PNG or WEBP, max 5MB.</p>
                    {preview?.size && (
                      <p className="mt-1">Selected file: {preview.size}</p>
                    )}
                  </div>

                  {avatarError && (
                    <p className="text-red-600 dark:text-red-400 text-sm mt-1">
                      {avatarError}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Save Button */}
            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? (
                <DotLoaderSpinner loading />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
