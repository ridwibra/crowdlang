"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import {
  Languages,
  LayoutDashboard,
  Loader2,
  LogOut,
  UserCircle,
} from "lucide-react";

export default function UserMenu() {
  // 1. Destructure data and isPending separately for clarity
  const { data, isPending } = authClient.useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [hasWorkspaceAccess, setHasWorkspaceAccess] = useState(false);

  useEffect(() => {
    if (!data?.user) {
      setHasWorkspaceAccess(false);
      return;
    }

    let active = true;

    const checkWorkspaceAccess = async () => {
      try {
        const response = await fetch("/api/workspace/access", {
          cache: "no-store",
        });

        const result = await response.json().catch(() => ({}));

        if (active) {
          setHasWorkspaceAccess(
            response.ok && result.hasWorkspaceAccess === true,
          );
        }
      } catch {
        if (active) {
          setHasWorkspaceAccess(false);
        }
      }
    };

    void checkWorkspaceAccess();

    return () => {
      active = false;
    };
  }, [data?.user]);

  // 2. Handle the loading/pending state
  // This prevents the component from trying to render user data before it's fetched.
  if (isPending) {
    return (
      <div className="w-8 h-8 flex items-center justify-center">
        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
      </div>
    );
  }

  // 3. Check if data or user is missing (Unauthenticated state)
  if (!data || !data.user) {
    return (
      <Link
        href="/login"
        className="text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-black dark:hover:text-white"
      >
        Login
      </Link>
    );
  }

  // 4. Safe access to the user object
  const user = data.user;
  // Use optional chaining and provide a fallback to avoid splitting an undefined name
  const firstName = user.name?.trim().split(/\s+/)[0] || "User";

  const role = (user as typeof user & { role?: string }).role;

  const canAccessAdmin = role === "admin" || role === "staff";

  const handleLogout = async () => {
    //Get session BEFORE signOut
    const sessionResponse = await authClient.getSession();
    const email = sessionResponse?.data?.user?.email;

    //Track logout BEFORE destroying the session
    if (email) {
      await fetch("/api/activity/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
    }

    // ⭐ Now safely sign out
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          setOpen(false);
          router.push("/login");
          router.refresh();
        },
      },
    });
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 cursor-pointer focus:outline-none"
      >
        {user.image ? (
          <div className="relative w-8 h-8 rounded-full overflow-hidden border border-gray-300 dark:border-gray-700">
            <Image
              src={user.image}
              alt={user.name || "User Avatar"}
              fill
              className="object-cover"
            />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center border border-gray-300 dark:border-gray-700">
            <UserCircle className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </div>
        )}

        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
          {firstName}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg py-1 z-50">
          {canAccessAdmin && (
            <Link
              href="/admin"
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
              onClick={() => setOpen(false)}
            >
              <LayoutDashboard className="h-4 w-4" />
              Admin
            </Link>
          )}
          {hasWorkspaceAccess && (
            <Link
              href="/workspace"
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
              onClick={() => setOpen(false)}
            >
              <Languages className="h-4 w-4" />
              Workspace
            </Link>
          )}

          <Link
            href="/profile"
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
            onClick={() => setOpen(false)}
          >
            <UserCircle className="w-4 h-4" />
            Profile
          </Link>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
