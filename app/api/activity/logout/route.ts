// app/api/activity/logout/route.ts

import { NextResponse } from "next/server";
import db from "@/utils/db";
import User from "@/models/User";
import { getSession } from "@/lib/server";

export async function POST() {
  try {
    await db.connect();

    const session = await getSession();

    if (!session?.user?.email) {
      return NextResponse.json(
        {
          ok: false,
          message: "Unauthorized.",
        },
        { status: 401 },
      );
    }

    const now = new Date();

    const user = await User.findOneAndUpdate(
      {
        email: session.user.email,
      },
      {
        $set: {
          lastLogout: now,
        },
        $push: {
          lastLogouts: {
            $each: [now],
            $slice: -50,
          },
        },
      },
      {
        returnDocument: "after",
      },
    );

    if (!user) {
      return NextResponse.json(
        {
          ok: false,
          message: "User was not found for logout activity tracking.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        lastLogout: user.lastLogout,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("POST /api/activity/logout error:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Failed to record logout activity.",
      },
      { status: 500 },
    );
  } 
}