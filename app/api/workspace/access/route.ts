// app/api/workspace/access/route.ts


import { auth } from "@/lib/auth";
import User from "@/models/User";
import db from "@/utils/db";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.email) {
      return NextResponse.json(
        { hasWorkspaceAccess: false },
        { status: 200 },
      );
    }

    await db.connect();

    const user = await User.findOne({
      email: session.user.email,
    })
      .select("languageRoles")
      .lean();

    if (!user) {
      return NextResponse.json(
        { hasWorkspaceAccess: false },
        { status: 200 },
      );
    }

    const languageRoles = (user.languageRoles || {}) as Record<
      string,
      unknown
    >;

    const hasWorkspaceAccess = Object.values(languageRoles).some(
      (role) => role === "editor" || role === "expert",
    );

    return NextResponse.json(
      { hasWorkspaceAccess },
      { status: 200 },
    );
  } catch (error) {
    console.error("GET /api/workspace/access error:", error);

    return NextResponse.json(
      { hasWorkspaceAccess: false },
      { status: 200 },
    );
  }
}