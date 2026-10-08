// app/api/table/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import db from "@/utils/db";
import Table from "@/models/Table";
import User from "@/models/User";
import { getSession } from "@/lib/server";
import { UserType } from "@/utils/types";
import Language from "@/models/Language";


const hasTableManagementPermission = (
  currentUserId: Types.ObjectId,
  currentUserRole: string,
  createdBy: Types.ObjectId | string | null | undefined,
): boolean => {
  if (currentUserRole === "admin" || currentUserRole === "root") {
    return true;
  }

  if (createdBy === null || createdBy === undefined) {
    return false;
  }

  return currentUserId.toString() === createdBy.toString();
};

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await db.connect();

    const { id } = await context.params;

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: "Invalid row ID" }, { status: 400 });
    }

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
    console.error("TABLE ROW GET ERROR:", error);

    return NextResponse.json(
      { message: error.message || "Failed to fetch row" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await db.connect();

    const session = await getSession();

    if (!session?.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: "Invalid row ID" }, { status: 400 });
    }

    const currentUser = session.user as typeof session.user & UserType;

    const mongoUser = await User.findOne({ email: currentUser.email })
      .select("_id role")
      .lean();

    if (!mongoUser) {
      return NextResponse.json(
        { message: "User not found in database" },
        { status: 404 },
      );
    }

    const existingRow = await Table.findById(id).select("createdBy").lean();

    if (!existingRow) {
      return NextResponse.json({ message: "Row not found" }, { status: 404 });
    }

    const canEdit = hasTableManagementPermission(
      mongoUser._id,
      mongoUser.role,
      existingRow.createdBy,
    );

    if (!canEdit) {
      return NextResponse.json(
        {
          message:
            "Forbidden. Only this row's creator, an admin, or root can edit it.",
        },
        { status: 403 },
      );
    }

    const { text, translation, language, textType } = await request.json();

    if (!text?.trim() || !translation?.trim() || !language || !textType) {
      return NextResponse.json(
        {
          message:
            "Text, translation, language, and textType are required.",
        },
        { status: 400 },
      );
    }

    const updated = await Table.findByIdAndUpdate(
      id,
      {
        $set: {
          text: text.trim(),
          translation: translation.trim(),
          language,
          textType,
        },
        $addToSet: {
          editedBy: mongoUser._id,
        },
      },
      {
        new: true,
        runValidators: true,
      },
    )
      .populate({ path: "createdBy", select: "name email", model: User })
      .populate({ path: "editedBy", select: "name email", model: User })
      .populate({ path: "language", select: "name", model: Language })
      .lean();

    return NextResponse.json(
      { message: "Row updated", row: updated },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("TABLE ROW PUT ERROR:", error);

    return NextResponse.json(
      { message: error.message || "Failed to update row" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await db.connect();

    const session = await getSession();

    if (!session?.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: "Invalid row ID" }, { status: 400 });
    }

    const currentUser = session.user as typeof session.user & UserType;

    const mongoUser = await User.findOne({ email: currentUser.email })
      .select("_id role")
      .lean();

    if (!mongoUser) {
      return NextResponse.json(
        { message: "User not found in database" },
        { status: 404 },
      );
    }

    const row = await Table.findById(id).select("createdBy").lean();

    if (!row) {
      return NextResponse.json({ message: "Row not found" }, { status: 404 });
    }

    const canDelete = hasTableManagementPermission(
      mongoUser._id,
      mongoUser.role,
      row.createdBy,
    );

    if (!canDelete) {
      return NextResponse.json(
        {
          message:
            "Forbidden. Only this row's creator, an admin, or root can delete it.",
        },
        { status: 403 },
      );
    }

    await Table.findByIdAndDelete(id);

    return NextResponse.json({ message: "Row deleted" }, { status: 200 });
  } catch (error: any) {
    console.error("TABLE ROW DELETE ERROR:", error);

    return NextResponse.json(
      { message: error.message || "Failed to delete row" },
      { status: 500 },
    );
  }
}