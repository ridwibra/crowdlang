// app/api/languages/[id]/status/route.ts
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import db from "@/utils/db";
import Language from "@/models/Language";

const ALLOWED_STATUSES = ["active", "archived"] as const;

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await db.connect();

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await context.params;
    const { status } = await request.json();

    if (!ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: "Status must be active or archived" },
        { status: 400 },
      );
    }

    const language = await Language.findByIdAndUpdate(
      id,
      { status },
      {
        returnDocument: "after",
        runValidators: true,
      },
    ).lean();

    if (!language) {
      return NextResponse.json(
        { error: "Language not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      message: "Language status updated",
      language: {
        _id: language._id.toString(),
        name: language.name,
        status: language.status,
      },
    });
  } catch (error) {
    console.error("PATCH /api/languages/[id]/status error:", error);

    return NextResponse.json(
      { error: "Failed to update language status" },
      { status: 500 },
    );
  } 
}