"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    // ⭐ getSession() returns { data: { user, session } }
    const session = await authClient.getSession();
    const email = session?.data?.user?.email;

    if (email) {
      await fetch("/api/activity/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
    }

    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/login");
        },
      },
    });
  };

  return (
    <button onClick={handleLogout} className="border px-3 py-2 rounded">
      Logout
    </button>
  );
}
