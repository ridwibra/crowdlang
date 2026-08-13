// app/api/activity/login/route.ts

import { NextResponse } from "next/server";
import db from "@/utils/db";
import User from "@/models/User";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim() : "";

    if (!email) {
      return NextResponse.json(
        {
          ok: false,
          message: "Email is required.",
        },
        { status: 400 },
      );
    }

    await db.connect();

    const now = new Date();

    const user = await User.findOneAndUpdate(
      {
        email,
      },
      {
        $set: {
          lastLogin: now,
        },
        $push: {
          lastLogins: {
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
          message: "User was not found for login activity tracking.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        lastLogin: user.lastLogin,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("POST /api/activity/login error:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Failed to record login activity.",
      },
      { status: 500 },
    );
  } 
}