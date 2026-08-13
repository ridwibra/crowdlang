// app/api/users/route.ts
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const response = await auth.api.listUsers({
      headers: await headers(),
      query: {},
    });

    const normalizedUsers = response.users.map((user: any) => ({
      _id: String(user._id ?? user.id),
      name: user.name ?? "",
      email: user.email ?? "",
      image: user.image ?? "",
      role: user.role ?? "user",
      createdAt: user.createdAt ?? "",
      emailVerified: user.emailVerified ?? false,
    }));

    return NextResponse.json({
      users: normalizedUsers,
      total: response.total,
    });
  } catch (error) {
    console.error("GET /api/users error:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 },
    );
  }
}