// app/api/table/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import db from "@/utils/db";
import Table from "@/models/Table";
import User from "@/models/User";
import { getSession } from "@/lib/server";
import { UserType } from "@/utils/types";
import Language from "@/models/Language";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await db.connect();

    const { id } = await context.params;

    const row = await Table.findById(id)
      .populate({ path: "createdBy", select: "name email", model: User })
      .populate({ path: "editedBy", select: "name email", model: User })
      .populate({ path: "language", select: "name", model: Language })
      .lean();

    if (!row) {
      return NextResponse.json({ message: "Row not found" }, { status: 404 });
    }

    return NextResponse.json({ row }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Failed to fetch row" },
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
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as typeof session.user & UserType;
    const { id } = await context.params;
    const body = await request.json();

    const mongoUser = await User.findOne({ email: user.email });
    if (!mongoUser) {
      return NextResponse.json(
        { message: "User not found in database" },
        { status: 404 }
      );
    }

    const { text, translation, language, textType } = body;

    if (!text || !translation || !language || !textType) {
      return NextResponse.json(
        { message: "Text, translation, language, and textType are required." },
        { status: 400 }
      );
    }

    const updated = await Table.findByIdAndUpdate(
      id,
      {
        $set: {
          text,
          translation,
          language,
          textType,
        },
        $push: {
          editedBy: mongoUser._id,
        },
      },
      {
        new: true,
        runValidators: true,
      }
    )
      .populate({ path: "createdBy", select: "name email", model: User })
      .populate({ path: "editedBy", select: "name email", model: User })
      .populate({ path: "language", select: "name", model: Language })
      .lean();

    if (!updated) {
      return NextResponse.json({ message: "Row not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Row updated", row: updated }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Failed to update row" },
      { status: 500 }
    );
  } 
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await db.connect();

    const session = await getSession();
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
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

    const deleted = await Table.findByIdAndDelete(id);

    if (!deleted) {
      return NextResponse.json({ message: "Row not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Row deleted" }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Failed to delete row" },
      { status: 500 }
    );
  } 
}