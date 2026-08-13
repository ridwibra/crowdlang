import { auth } from "@/lib/auth";
import ChatbotCall from "@/models/CrowdRAGItem";

import Language from "@/models/Language";
import LanguageRoleRequest from "@/models/LanguageRoleRequest";
import User from "@/models/User";
import db from "@/utils/db";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

type GlobalRole = "user" | "staff" | "admin";

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    const role = (session?.user as { role?: GlobalRole } | undefined)?.role;

    if (!session?.user) {
      return NextResponse.json(
        { error: "You must be signed in." },
        { status: 401 },
      );
    }

    if (role !== "admin" && role !== "staff") {
      return NextResponse.json(
        { error: "Admin or staff access is required." },
        { status: 403 },
      );
    }

    await db.connect();

    const [
      usersCount,
      languagesCount,
      pendingRequestsCount,
      latestChatbotCall,
    ] = await Promise.all([
      User.countDocuments(),

      Language.countDocuments(),

      LanguageRoleRequest.countDocuments({
        status: "pending",
      }),

      ChatbotCall.findOne()
        .sort({ createdAt: -1 })
        .select("createdAt")
        .lean(),
    ]);

    return NextResponse.json({
      usersCount,
      languagesCount,
      pendingRequestsCount,
      latestChatbotCallAt: latestChatbotCall?.createdAt
        ? new Date(latestChatbotCall.createdAt).toISOString()
        : null,
    });
  } catch (error) {
    console.error("GET /api/dashboard error:", error);

    return NextResponse.json(
      {
        error: "Failed to load dashboard summary.",
      },
      {
        status: 500,
      },
    );
  }
}