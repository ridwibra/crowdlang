// app/api/activity/me/route.ts

import { NextResponse } from "next/server";
import User from "@/models/User";
import { getSession } from "@/lib/server";
import db from "@/utils/db";

export async function GET() {
  try {
    await db.connect();

    const session = await getSession();

    if (!session?.user?.email) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    const user = await User.findOne({
      email: session.user.email,
    })
      .select(
        [
          "name",
          "email",
          "image",
          "avatar",
          "bio",
          "role",
          "emailVerified",
          "languageRoles",
          "lastLogin",
          "lastLogout",
          "lastLogins",
          "lastLogouts",
          "createdAt",
        ].join(" "),
      )
      .lean();

    if (!user) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    return NextResponse.json({ user }, { status: 200 });
  } catch (error) {
    console.error("GET /api/activity/me error:", error);

    return NextResponse.json(
      {
        message: "Failed to load profile activity.",
      },
      { status: 500 },
    );
  } 
}