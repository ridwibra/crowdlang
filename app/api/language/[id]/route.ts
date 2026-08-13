// app/api/language/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import db from "@/utils/db";
import Language from "@/models/Language";
import User from "@/models/User";
import { getSession } from "@/lib/server";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await db.connect();

    const { id } = await context.params;

    const language = await Language.findById(id)
      .populate({ path: "createdBy", select: "name email", model: User })
      .lean();

    if (!language) {
      return NextResponse.json(
        { field: "general", message: "Language not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ language }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { field: "general", message: error.message || "Failed to fetch language" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await db.connect();

    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { field: "general", message: "You are not signed in. Sign in and try again."  },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const body = await request.json();

    const updated = await Language.findByIdAndUpdate(id, body, {
      returnDocument: "after",
      runValidators: true,
    })
      .populate({ path: "createdBy", select: "name email", model: User })
      .lean();

    if (!updated) {
      return NextResponse.json(
        { field: "general", message: "Language not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Language updated",
      language: updated
    });
  } catch (error: any) {
    return NextResponse.json(
      { field: "general", message: error.message || "Failed to update language" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await db.connect();

    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { field: "general", message: "You are not signed in. Sign in and try again."  },
        { status: 401 }
      );
    }

    const role = session.user.role; 
    const allowedRoles = ["admin", "staff"];

    if (!allowedRoles.includes(role)) {
      return NextResponse.json(
        { field: "general", message: "You do not have permission to delete languages." },
        { status: 403 }
      );
    }

    const { id } = await context.params;

    const deleted = await Language.findByIdAndDelete(id);

    if (!deleted) {
      return NextResponse.json(
        { field: "general", message: "Language not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Language deleted" });
  } catch (error: any) {
    return NextResponse.json(
      { field: "general", message: error.message || "Failed to delete language" },
      { status: 500 }
    );
  }
}
